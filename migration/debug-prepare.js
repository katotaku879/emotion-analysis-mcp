const { Pool } = require('pg');
const config = require('./config');

async function testPrepareStatements() {
  const pool = new Pool(config.database);
  
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    
    console.log('Creating prepared statements...');
    
    // 1つずつ準備文を作成してテスト
    try {
      await client.query('PREPARE get_emotion_type_id (VARCHAR) AS SELECT id FROM emotion_types WHERE name = $1');
      console.log('✅ get_emotion_type_id created');
    } catch (error) {
      console.log('❌ get_emotion_type_id failed:', error.message);
    }
    
    try {
      await client.query('PREPARE get_category_id (VARCHAR) AS SELECT id FROM categories WHERE name = $1');
      console.log('✅ get_category_id created');
    } catch (error) {
      console.log('❌ get_category_id failed:', error.message);
    }
    
    try {
      await client.query('PREPARE get_activity_id (VARCHAR) AS SELECT id FROM activities WHERE name = TRIM($1)');
      console.log('✅ get_activity_id created');
    } catch (error) {
      console.log('❌ get_activity_id failed:', error.message);
    }
    
    try {
      await client.query('PREPARE insert_emotion_log (UUID, DATE, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, TEXT) AS INSERT INTO emotion_logs (id, date, activity_id, activity_custom, emotion_type_id, category_id, intensity, thoughts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)');
      console.log('✅ insert_emotion_log created');
    } catch (error) {
      console.log('❌ insert_emotion_log failed:', error.message);
    }
    
    // 準備文確認
    const result = await client.query('SELECT name FROM pg_prepared_statements');
    console.log('Created prepared statements:', result.rows.map(r => r.name));
    
    client.release();
    
  } catch (error) {
    console.error('Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testPrepareStatements();
