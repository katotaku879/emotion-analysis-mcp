import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'mkykr',
  host: 'localhost',
  database: 'emotion_analysis',
  password: process.env.DB_PASSWORD || 'Apple0420',
  port: 5432,
});

async function analyzeDataDistribution() {
  console.log('📊 メッセージデータの分析\n');
  console.log('='.repeat(50));
  
  // 全メッセージを取得
  const result = await pool.query(`
    SELECT content, created_at 
    FROM conversation_messages 
    WHERE sender = 'user'
    ORDER BY created_at DESC
  `);
  
  const messages = result.rows;
  console.log(`総メッセージ数: ${messages.length}\n`);
  
  // 各性格特性のキーワード
  const indicators = {
    openness: ['新しい', '挑戦', '学習', '創造', '興味', '発見', '探求', '試', 'アイデア'],
    conscientiousness: ['計画', '完璧', '責任', '整理', '継続', '目標', '達成', '完了', '管理'],
    extraversion: ['人', '話', '楽しい', '一緒', '会', 'パーティー', '交流', '友達', '同僚'],
    agreeableness: ['助け', '協力', '思いやり', '共感', '優しい', '配慮', '理解', '支援', 'サポート'],
    neuroticism: ['不安', '心配', 'ストレス', '怖い', '緊張', '悩み', '焦り', 'イライラ', '落ち込']
  };
  
  // 詳細な分析
  const analysis = {};
  
  for (const [trait, keywords] of Object.entries(indicators)) {
    let messageWithKeyword = 0;
    let totalKeywordCount = 0;
    const keywordFreq = {};
    
    // 各キーワードの頻度を計算
    keywords.forEach(keyword => {
      keywordFreq[keyword] = 0;
    });
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      let hasAnyKeyword = false;
      
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          keywordFreq[keyword]++;
          totalKeywordCount++;
          hasAnyKeyword = true;
        }
      });
      
      if (hasAnyKeyword) {
        messageWithKeyword++;
      }
    });
    
    analysis[trait] = {
      messagesWithKeyword: messageWithKeyword,
      percentage: ((messageWithKeyword / messages.length) * 100).toFixed(2),
      totalKeywordCount: totalKeywordCount,
      avgKeywordsPerMessage: (totalKeywordCount / messages.length).toFixed(4),
      topKeywords: Object.entries(keywordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}(${v}回)`)
    };
  }
  
  // 結果表示
  console.log('【性格特性別の出現統計】\n');
  
  for (const [trait, data] of Object.entries(analysis)) {
    console.log(`📌 ${trait}`);
    console.log(`   含有率: ${data.percentage}% のメッセージにキーワード含有`);
    console.log(`   総出現: ${data.totalKeywordCount}回`);
    console.log(`   平均: メッセージあたり${data.avgKeywordsPerMessage}回`);
    console.log(`   TOP3: ${data.topKeywords.join(', ')}`);
    console.log('');
  }
  
  // 推奨スコア計算式
  console.log('【推奨スコア計算】\n');
  
  for (const [trait, data] of Object.entries(analysis)) {
    const baseScore = parseFloat(data.percentage);
    
    // 3つの計算方法を提案
    const method1 = Math.min(100, Math.round(baseScore * 2.5)); // 単純倍率
    const method2 = Math.min(100, Math.round(30 + baseScore * 1.5)); // ベース+倍率
    const method3 = Math.min(100, Math.round(Math.sqrt(baseScore) * 15)); // 平方根スケール
    
    console.log(`${trait}:`);
    console.log(`  実際の出現率: ${baseScore}%`);
    console.log(`  方法1 (×2.5): ${method1}`);
    console.log(`  方法2 (30+×1.5): ${method2}`);
    console.log(`  方法3 (√×15): ${method3}`);
    console.log('');
  }
  
  pool.end();
}

analyzeDataDistribution().catch(console.error);
