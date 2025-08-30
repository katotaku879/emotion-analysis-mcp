import dotenv from 'dotenv';
import { behavior_prediction } from './dist/tools/personal-ai/behavior_prediction.js';

dotenv.config({ path: '../.env' });

async function generateHealthAlert() {
  const result = await behavior_prediction.handler({
    context: 'health',
    horizon_days: 30
  });
  
  console.log('\n' + '⚠️'.repeat(30));
  console.log('     健康リスク警告レポート');
  console.log('⚠️'.repeat(30) + '\n');
  
  result.forEach(prediction => {
    if (prediction.likelihood > 0.7) {
      console.log(`🔴 ${prediction.behavior_type}`);
      console.log(`   リスクレベル: ${Math.round(prediction.likelihood * 100)}%`);
      console.log(`   要因:`);
      prediction.contributing_factors.forEach(f => console.log(`     • ${f}`));
      console.log(`   推奨対策:`);
      prediction.recommendations.forEach(r => console.log(`     ✓ ${r}`));
      console.log('');
    }
  });
  
  process.exit(0);
}

generateHealthAlert();
