import { emotionQueries } from './src/database/queries.js';

async function interactiveDemo() {
  console.log('🎯 Emotion Analysis MCP Server - Interactive Demo\n');

  try {
    // 1. 最近の感情分析
    console.log('📊 Analyzing your recent emotions...');
    const emotions = await emotionQueries.getEmotionSummary(30);
    console.log(`✨ In the last 30 days: ${emotions.totalRecords} records, average intensity ${emotions.averageIntensity}/10`);
    console.log(`🎭 Most common emotion: ${emotions.predominantEmotion}\n`);

    // 2. 人気活動の分析
    console.log('🎯 Analyzing popular activities...');
    const ccnaAnalysis = await emotionQueries.getActivityAnalysis('CCNAの勉強');
    console.log(`📚 CCNA学習: ${ccnaAnalysis.totalOccurrences} times, ${ccnaAnalysis.emotionImpact.averageIntensity}/10 avg intensity`);
    
    const workAnalysis = await emotionQueries.getActivityAnalysis('仕事');
    console.log(`💼 仕事: ${workAnalysis.totalOccurrences} times, ${workAnalysis.emotionImpact.averageIntensity}/10 avg intensity\n`);

    // 3. 幸福トリガー
    console.log('✨ Your happiness triggers...');
    const triggers = await emotionQueries.getHappinessTriggers(8);
    triggers.slice(0, 5).forEach((t, i) => {
      console.log(`${i + 1}. ${t.activity} (${t.avg_intensity}/10, ${t.occurrences} times)`);
    });

    console.log('\n🎉 MCP Server fully functional and ready for Claude integration!');
    console.log('\n💡 Next steps:');
    console.log('   1. Install Claude Desktop app');
    console.log('   2. Configure MCP server connection');
    console.log('   3. Chat with Claude using your emotion data');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

interactiveDemo();
