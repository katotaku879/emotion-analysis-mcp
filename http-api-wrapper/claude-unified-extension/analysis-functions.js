// server.jsに追加する分析関数

async function analyzeWorkStress() {
  const result = await pool.query(`
    SELECT 
      content,
      created_at
    FROM conversation_messages
    WHERE created_at > NOW() - INTERVAL '7 days'
    AND (
      content ILIKE '%夜勤%' OR
      content ILIKE '%トラブル%' OR
      content ILIKE '%ストレス%' OR
      content ILIKE '%疲れ%' OR
      content ILIKE '%辛い%'
    )
  `);
  
  const stressKeywords = ['夜勤', 'トラブル', 'ピリピリ', '疲れ', '辛い'];
  let stressScore = 0;
  
  result.rows.forEach(row => {
    stressKeywords.forEach(keyword => {
      if (row.content.includes(keyword)) {
        stressScore += 10;
      }
    });
  });
  
  return {
    level: Math.min(100, stressScore),
    factors: stressKeywords.filter(k => 
      result.rows.some(r => r.content.includes(k))
    ),
    messageCount: result.rows.length,
    recommendation: stressScore > 70 ? '休息が必要' : '通常レベル'
  };
}

async function calculateJobChangeUrgency() {
  const stress = await analyzeWorkStress();
  
  let urgency = stress.level * 0.8;
  
  // 転職関連キーワードをチェック
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM conversation_messages
    WHERE created_at > NOW() - INTERVAL '30 days'
    AND content ILIKE '%転職%'
  `);
  
  if (result.rows[0].count > 5) {
    urgency += 20;
  }
  
  return {
    urgency: Math.min(100, Math.round(urgency)),
    factors: ['ストレスレベル', '転職検討頻度'],
    recommendation: urgency > 70 ? '転職活動を開始' : '現状維持可能'
  };
}

function generateRecommendations(stress, job) {
  const recommendations = [];
  
  if (stress.level > 80) {
    recommendations.push('即座に休息を取る');
    recommendations.push('上司に相談する');
  }
  
  if (job.urgency > 70) {
    recommendations.push('職務経歴書を更新');
    recommendations.push('転職サイトに登録');
    recommendations.push('ポートフォリオを準備');
  }
  
  if (stress.level > 50 && stress.level <= 80) {
    recommendations.push('ストレス解消法を実践');
    recommendations.push('定期的な休憩を取る');
  }
  
  return recommendations;
}
