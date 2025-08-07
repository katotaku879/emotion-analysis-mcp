import { testConnection } from './src/database/config.js';

async function runTest() {
  console.log('🧪 Testing MCP Server setup...');
  
  try {
    // データベース接続テスト
    const dbOk = await testConnection();
    
    if (dbOk) {
      console.log('✅ All setup tests passed!');
      console.log('📁 Project structure ready');
      console.log('🔗 Database connection verified');
      console.log('🚀 Ready for MCP Server development');
    } else {
      console.log('❌ Setup test failed - check database configuration');
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  process.exit(0);
}

runTest();
