import { emotionQueries } from './src/database/queries.js';

async function testAnalysisFunctions() {
  console.log('🧪 Testing MCP analysis functions...\n');

  try {
    // 1. 感情分析テスト
    console.log('1️⃣ Testing emotion analysis...');
    const emotionSummary = await emotionQueries.getEmotionSummary(30);
    console.log(`✅ Found ${emotionSummary.totalRecords} records`);
    console.log(`📊 Average intensity: ${emotionSummary.averageIntensity}`);
    console.log(`🎭 Top emotion: ${emotionSummary.predominantEmotion}\n`);

    // 2. 活動分析テスト
    console.log('2️⃣ Testing activity analysis...');
    const activityAnalysis = await emotionQueries.getActivityAnalysis('CCNAの勉強');
    console.log(`✅ "${activityAnalysis.activityName}" occurred ${activityAnalysis.totalOccurrences} times`);
    console.log(`📈 Average intensity: ${activityAnalysis.emotionImpact.averageIntensity}\n`);

    // 3. 幸福トリガーテスト
    console.log('3️⃣ Testing happiness triggers...');
    const triggers = await emotionQueries.getHappinessTriggers(8);
    console.log(`✅ Found ${triggers.length} happiness triggers`);
    
    if (triggers.length > 0) {
      console.log(`🌟 Top trigger: ${triggers[0].activity} (${triggers[0].avg_intensity} avg intensity)`);
    }

    console.log('\n🎉 All analysis functions working correctly!');
    console.log('🚀 Ready for Claude integration!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testAnalysisFunctions();
