// migration/data-converter.js
const { Pool } = require('pg');

class DataConverter {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.pool = new Pool(config.database);
    this.stats = {
      processed: 0,
      skipped: 0,
      corrected: 0,
      errors: {
        invalidUuid: 0,
        unknownEmotion: 0,
        invalidIntensity: 0,
        trimmedActivity: 0
      }
    };
  }

  async initialize() {
    try {
      // データベース接続テスト
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.logger.info('DataConverter initialized successfully');
    } catch (error) {
      this.logger.fatal('DataConverter initialization failed', null, { error: error.message });
      throw error;
    }
  }

  async convertRecord(jsonRecord) {
    try {
      // 基本データ検証
      this.validateRequiredFields(jsonRecord);
      
      // 各フィールド変換
      const converted = {
        id: this.validateUUID(jsonRecord.id),
        date: this.validateDate(jsonRecord.date),
        intensity: this.validateIntensity(jsonRecord.intensity),
        thoughts: jsonRecord.thoughts || null
      };

      // 外部キー変換
      converted.emotion_type_id = await this.convertEmotionName(jsonRecord.emotion);
      converted.category_id = await this.convertCategoryName(jsonRecord.category);
      
      // 活動名変換（正規化+フォールバック）
      const activityResult = await this.convertActivityName(jsonRecord.activity);
      converted.activity_id = activityResult.id;
      converted.activity_custom = activityResult.custom;

      return converted;
    } catch (error) {
      error.recordId = jsonRecord.id;
      throw error;
    }
  }

  validateRequiredFields(record) {
    const required = ['id', 'date', 'emotion', 'intensity'];
    for (const field of required) {
      if (!record[field]) {
        const error = new Error(`Required field missing: ${field}`);
        error.level = 'ERROR';
        throw error;
      }
    }
  }

  validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      const error = new Error(`Invalid UUID format: ${uuid}`);
      error.level = 'ERROR';
      this.stats.errors.invalidUuid++;
      throw error;
    }
    return uuid;
  }

  validateDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const error = new Error(`Invalid date format: ${dateStr}`);
      error.level = 'ERROR';
      throw error;
    }
    return dateStr;
  }

  validateIntensity(intensity) {
    const num = parseInt(intensity);
    if (isNaN(num) || num < 1 || num > 10) {
      const error = new Error(`Intensity out of range: ${intensity}`);
      error.level = 'ERROR';
      this.stats.errors.invalidIntensity++;
      throw error;
    }
    return num;
  }

  async convertEmotionName(emotionName) {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT id FROM emotion_types WHERE name = $1', [emotionName]);
      if (result.rows.length === 0) {
        const error = new Error(`Unknown emotion: ${emotionName}`);
        error.level = 'ERROR';
        this.stats.errors.unknownEmotion++;
        throw error;
      }
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async convertCategoryName(categoryName) {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT id FROM categories WHERE name = $1', [categoryName]);
      if (result.rows.length === 0) {
        const error = new Error(`Unknown category: ${categoryName}`);
        error.level = 'ERROR';
        throw error;
      }
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async convertActivityName(activityName) {
    const trimmed = activityName.trim();
    
    // 空白除去の警告
    if (trimmed !== activityName) {
      this.logger.warning('Activity name trimmed', null, {
        original: activityName,
        corrected: trimmed
      });
      this.stats.errors.trimmedActivity++;
      this.stats.corrected++;
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT id FROM activities WHERE name = TRIM($1)', [trimmed]);
      
      if (result.rows.length > 0) {
        // 正規化された活動が見つかった
        const activityId = result.rows[0].id;
        await client.query('UPDATE activities SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [activityId]);
        return { id: activityId, custom: null };
      } else {
        // 正規化されていない活動
        return { id: null, custom: trimmed };
      }
    } finally {
      client.release();
    }
  }

  async insertRecord(convertedRecord) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO emotion_logs (id, date, activity_id, activity_custom, emotion_type_id, category_id, intensity, thoughts) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        convertedRecord.id,
        convertedRecord.date,
        convertedRecord.activity_id,
        convertedRecord.activity_custom,
        convertedRecord.emotion_type_id,
        convertedRecord.category_id,
        convertedRecord.intensity,
        convertedRecord.thoughts
      ]);
      this.stats.processed++;
    } finally {
      client.release();
    }
  }

  getStats() {
    return { ...this.stats };
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = DataConverter;
