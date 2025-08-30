// ========== 自動分析機能 ==========

// 分析結果のキャッシュ
let analysisCache = {
  lastUpdate: null,
  stressAnalysis: null,
  jobUrgency: null,
  recommendations: []
};

// ストレス分析関数
async function analyzeWorkStress() {
  try {
    const result = await pool.query(`
      SELECT content, created_at
      FROM conversation_messages
      WHERE created_at > NOW() - INTERVAL '7 days'
      AND (
        content ILIKE '%夜勤%' OR
        content ILIKE '%トラブル%' OR
        content ILIKE '%ストレス%' OR
        content ILIKE '%疲れ%' OR
        content ILIKE '%辛い%'
      )
      LIMIT 100
    `);
    
    const stressKeywords = ['夜勤', 'トラブル', 'ピリピリ', '疲れ', '辛い'];
    let stressScore = 0;
    const foundFactors = new Set();
    
    result.rows.forEach(row => {
      stressKeywords.forEach(keyword => {
        if (row.content.includes(keyword)) {
          stressScore += 10;
          foundFactors.add(keyword);
        }
      });
    });
    
    return {
      level: Math.min(100, stressScore),
      factors: Array.from(foundFactors),
      messageCount: result.rows.length,
      recommendation: stressScore > 70 ? '休息が必要です' : '通常レベル'
    };
  } catch (error) {
    console.error('Stress analysis error:', error);
    return { level: 0, factors: [], messageCount: 0, recommendation: 'エラー' };
  }
}

// 転職緊急度計算
async function calculateJobChangeUrgency() {
  try {
    const stress = await analyzeWorkStress();
    let urgency = stress.level * 0.8;
    
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM conversation_messages
      WHERE created_at > NOW() - INTERVAL '30 days'
      AND content ILIKE '%転職%'
    `);
    
    if (parseInt(result.rows[0].count) > 5) {
      urgency += 20;
    }
    
    return {
      urgency: Math.min(100, Math.round(urgency)),
      factors: ['ストレスレベル', '転職検討頻度'],
      recommendation: urgency > 70 ? '転職活動を開始すべき' : '現状維持可能'
    };
  } catch (error) {
    console.error('Job urgency error:', error);
    return { urgency: 0, factors: [], recommendation: 'エラー' };
  }
}

// 推奨事項生成
function generateRecommendations(stress, job) {
  const recommendations = [];
  
  if (stress.level > 80) {
    recommendations.push('🚨 即座に休息を取ってください');
    recommendations.push('💬 上司や同僚に相談しましょう');
  } else if (stress.level > 50) {
    recommendations.push('😌 ストレス解消法を実践しましょう');
    recommendations.push('⏰ 定期的な休憩を心がけてください');
  }
  
  if (job.urgency > 70) {
    recommendations.push('📝 職務経歴書を更新しましょう');
    recommendations.push('🔍 転職サイトに登録しましょう');
    recommendations.push('💼 ポートフォリオを準備しましょう');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ 現在は特に問題ありません');
  }
  
  return recommendations;
}

// 自動分析実行
async function performAutoAnalysis() {
  console.log('🔄 自動分析を実行中...');
  
  try {
    const stressResult = await analyzeWorkStress();
    const jobResult = await calculateJobChangeUrgency();
    const recommendations = generateRecommendations(stressResult, jobResult);
    
    analysisCache = {
      lastUpdate: new Date().toISOString(),
      stressAnalysis: stressResult,
      jobUrgency: jobResult,
      recommendations: recommendations
    };
    
    console.log('✅ 自動分析完了:', {
      stress: stressResult.level,
      urgency: jobResult.urgency
    });
    
    if (stressResult.level > 80 || jobResult.urgency > 80) {
      console.log('⚠️ 警告: 高ストレス/転職緊急度を検出');
    }
    
  } catch (error) {
    console.error('❌ 自動分析エラー:', error);
  }
}

// エンドポイント追加
app.get('/api/auto-analysis', (req, res) => {
  res.json({
    ...analysisCache,
    isRealtime: false,
    nextUpdate: new Date(Date.now() + 300000).toISOString()
  });
});

app.post('/api/analyze-now', async (req, res) => {
  await performAutoAnalysis();
  res.json({
    ...analysisCache,
    isRealtime: true
  });
});

// 5分ごとに自動実行
setInterval(performAutoAnalysis, 300000);

// 起動時に初回実行
setTimeout(performAutoAnalysis, 5000);

console.log('✅ 自動分析機能を開始しました（5分ごと）');
