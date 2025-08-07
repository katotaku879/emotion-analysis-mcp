const fs = require('fs');
const path = require('path');
const config = require('./config');

async function testSingleRecord() {
  try {
    // JSONファイル読み込み
    const jsonFilePath = '/mnt/c/Users/mkykr/Pythonプログラム/自己肯定アプリ/streamlit_app.py/emotion_logs_fixed.json';
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const jsonData = JSON.parse(rawData);
    
    console.log('Total records:', jsonData.length);
    console.log('First record:', JSON.stringify(jsonData[0], null, 2));
    
    // データ変換器の簡単テスト
    const DataConverter = require('./data-converter');
    const Logger = require('./logger');
    
    const logger = new Logger(config);
    const converter = new DataConverter(config, logger);
    
    await converter.initialize();
    
    console.log('Testing first record conversion...');
    const convertedRecord = await converter.convertRecord(jsonData[0]);
    console.log('Converted record:', JSON.stringify(convertedRecord, null, 2));
    
  } catch (error) {
    console.error('Debug test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSingleRecord();
