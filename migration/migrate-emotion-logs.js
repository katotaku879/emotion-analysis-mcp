// migration/migrate-emotion-logs.js
const fs = require('fs');
const path = require('path');
const config = require('./config');
const Logger = require('./logger');
const DataConverter = require('./data-converter');

class EmotionLogsMigration {
  constructor() {
    this.logger = new Logger(config);
    this.converter = new DataConverter(config, this.logger);
    this.stats = {
      totalRecords: 0,
      processedRecords: 0,
      skippedRecords: 0,
      correctedRecords: 0,
      startTime: null,
      endTime: null
    };
  }

  async initialize() {
    try {
      this.logger.info('=== Emotion Logs Migration Started ===');
      this.stats.startTime = new Date();
      
      // データ変換器の初期化
      await this.converter.initialize();
      
      // JSONファイルの存在確認
      await this.validateJsonFile();
      
      this.logger.info('Migration initialization completed');
    } catch (error) {
      this.logger.fatal('Migration initialization failed', null, { error: error.message });
      throw error;
    }
  }

  async validateJsonFile() {
    const jsonFilePath = config.paths.jsonData; // path.join は不要
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`JSON file not found: ${jsonFilePath}`);
    }

    // ファイルサイズ確認
    const stats = fs.statSync(jsonFilePath);
    this.logger.info('JSON file validated', null, {
      path: jsonFilePath,
      size: `${(stats.size / 1024).toFixed(1)} KB`
    });
  }

  async loadJsonData() {
    try {
      const jsonFilePath = config.paths.jsonData; // path.join は不要
      const rawData = fs.readFileSync(jsonFilePath, 'utf8');
      const jsonData = JSON.parse(rawData);
      
      this.stats.totalRecords = jsonData.length;
      this.logger.info('JSON data loaded successfully', null, {
        totalRecords: this.stats.totalRecords
      });
      
      return jsonData;
    } catch (error) {
      this.logger.fatal('Failed to load JSON data', null, { error: error.message });
      throw error;
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async processBatch(batch, batchIndex, totalBatches) {
    const batchStats = {
      processed: 0,
      skipped: 0,
      corrected: 0,
      errors: []
    };

    this.logger.info(`Processing batch ${batchIndex + 1}/${totalBatches}`, null, {
      batchSize: batch.length
    });

    for (const record of batch) {
      try {
        const convertedRecord = await this.converter.convertRecord(record);
        await this.converter.insertRecord(convertedRecord);
        batchStats.processed++;
      } catch (error) {
        if (error.level === 'FATAL') {
          throw error;
        } else if (error.level === 'ERROR') {
          this.logger.error(error.message, error.recordId);
          batchStats.skipped++;
          batchStats.errors.push({
            recordId: error.recordId,
            error: error.message
          });
        } else if (error.level === 'WARNING') {
          batchStats.corrected++;
        }
      }
    }

    // 統計更新
    this.stats.processedRecords += batchStats.processed;
    this.stats.skippedRecords += batchStats.skipped;
    this.stats.correctedRecords += batchStats.corrected;

    // 進捗表示
    const progressPercent = ((this.stats.processedRecords + this.stats.skippedRecords) / this.stats.totalRecords * 100).toFixed(1);
    this.logger.info(`Batch ${batchIndex + 1} completed`, null, {
      progress: `${progressPercent}%`,
      processed: batchStats.processed,
      skipped: batchStats.skipped,
      corrected: batchStats.corrected
    });

    return batchStats;
  }

  async processAllBatches(jsonData) {
    const batchSize = config.processing.batchSize;
    const batches = this.chunkArray(jsonData, batchSize);
    
    this.logger.info('Starting batch processing', null, {
      totalBatches: batches.length,
      batchSize: batchSize
    });

    for (let i = 0; i < batches.length; i++) {
      await this.processBatch(batches[i], i, batches.length);
      
      // エラー率チェック
      if (this.shouldStopDueToErrors()) {
        throw new Error('Migration stopped due to high error rate');
      }
    }
  }

  shouldStopDueToErrors() {
    const totalProcessed = this.stats.processedRecords + this.stats.skippedRecords;
    if (totalProcessed === 0) return false;

    const errorRate = this.stats.skippedRecords / totalProcessed;
    const threshold = config.processing.errorThresholds.errorRate;

    if (errorRate > threshold) {
      this.logger.fatal('High error rate detected', null, {
        errorRate: `${(errorRate * 100).toFixed(2)}%`,
        threshold: `${(threshold * 100).toFixed(2)}%`,
        skippedRecords: this.stats.skippedRecords,
        totalProcessed: totalProcessed
      });
      return true;
    }

    return false;
  }

  generateFinalReport() {
    this.stats.endTime = new Date();
    const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
    
    const successRate = this.stats.totalRecords > 0 
      ? (this.stats.processedRecords / this.stats.totalRecords * 100).toFixed(1)
      : 0;

    const report = `
=== Migration Summary Report ===
Start Time: ${this.stats.startTime.toISOString()}
End Time: ${this.stats.endTime.toISOString()}
Duration: ${duration} seconds

Records:
- Total: ${this.stats.totalRecords}
- Processed: ${this.stats.processedRecords} (${successRate}%)
- Skipped: ${this.stats.skippedRecords}
- Corrected: ${this.stats.correctedRecords}

Converter Stats:
${JSON.stringify(this.converter.getStats(), null, 2)}

Result: ${this.stats.skippedRecords === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS'}
`;

    this.logger.info(report);
    console.log(report);
  }

  async run() {
    try {
      // 初期化
      await this.initialize();
      
      // JSONデータ読み込み
      const jsonData = await this.loadJsonData();
      
      // バッチ処理実行
      await this.processAllBatches(jsonData);
      
      // 最終レポート生成
      this.generateFinalReport();
      
    } catch (error) {
      this.logger.fatal('Migration failed', null, { error: error.message });
      console.error('Migration failed:', error.message);
      process.exit(1);
    } finally {
      // リソースクリーンアップ
      await this.converter.close();
      this.logger.close();
    }
  }
}

// メイン実行
if (require.main === module) {
  const migration = new EmotionLogsMigration();
  migration.run().catch(console.error);
}

module.exports = EmotionLogsMigration;
