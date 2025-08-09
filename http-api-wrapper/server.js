import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

// Personal AIルートをインポート
import * as personalAI from './routes/personal-ai.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.API_PORT || 3000;
const MCP_SERVER_URL = 'http://localhost:3001';

// データベース接続
const pool = new Pool({
  user: process.env.DB_USER || 'mkykr',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'emotion_analysis',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// ミドルウェア
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ロギングミドルウェア
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ======= Personal AI エンドポイント =======
app.post('/api/personal-ai/analyze-cause', personalAI.analyzeCause);
app.get('/api/personal-ai/self-profile', personalAI.getSelfProfile);
app.get('/api/personal-ai/emotion-patterns', personalAI.getEmotionPatterns);
app.get('/api/personal-ai/predictions', personalAI.getBehaviorPredictions);

// ======= 既存のエンドポイント =======

// 統計情報
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT DATE(created_at)) as total_days,
        MAX(created_at) as last_message
      FROM conversation_messages
      WHERE sender = 'user'
    `);
    
    res.json({
      totalMessages: parseInt(result.rows[0].total_messages),
      totalDays: parseInt(result.rows[0].total_days),
      lastMessage: result.rows[0].last_message
    });
  } catch (error) {
    console.error('統計エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// 汎用分析エンドポイント
app.post('/api/analyze', async (req, res) => {
  try {
    const { tool, parameters } = req.body;
    console.log(`🔧 MCPツール呼び出し: ${tool}`);
    
    const response = await fetch(`${MCP_SERVER_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, parameters })
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('分析エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// 会話保存エンドポイント
app.post('/api/conversations/save', async (req, res) => {
  const { messages } = req.body;
  console.log(`📝 Saving ${messages?.length || 0} messages...`);
  
  try {
    let savedCount = 0;
    const sessionId = '2e50ff7a-3c28-423e-a4f4-165e16017766';
    
    // 現在の最大message_sequenceを取得
    const maxSeqResult = await pool.query(
      'SELECT COALESCE(MAX(message_sequence), 0) as max_seq FROM conversation_messages WHERE session_id = $1',
      [sessionId]
    );
    let currentSeq = parseInt(maxSeqResult.rows[0].max_seq);
    
    for (const msg of messages || []) {
      currentSeq++;
      
      const result = await pool.query(`
        INSERT INTO conversation_messages 
        (session_id, message_sequence, sender, content, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING message_id
      `, [
        sessionId,
        currentSeq,
        msg.role === 'user' ? 'user' : 'claude',
        msg.content,
        new Date(msg.timestamp || Date.now())
      ]);
      
      if (result.rows.length > 0) {
        savedCount++;
      }
    }
    
    console.log(`✅ Total saved: ${savedCount} messages`);
    res.json({ success: true, saved: savedCount });
  } catch (error) {
    console.error('❌ Save error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Personal AI HTTP API Wrapper',
    timestamp: new Date().toISOString()
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('❌ サーバーエラー:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log('================================');
  console.log('🚀 Personal AI API Server');
  console.log('================================');
  console.log(`✅ ポート: ${PORT}`);
  console.log(`✅ MCP Server: ${MCP_SERVER_URL}`);
  console.log(`✅ データベース: ${process.env.DB_NAME || 'emotion_analysis'}`);
  console.log('');
  console.log('📍 エンドポイント:');
  console.log('  POST /api/personal-ai/analyze-cause');
  console.log('  GET  /api/personal-ai/self-profile');
  console.log('  GET  /api/personal-ai/emotion-patterns');
  console.log('  GET  /api/personal-ai/predictions');
  console.log('================================');
});

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  console.log('\n👋 サーバーを終了しています...');
  await pool.end();
  process.exit(0);
});

export default app;

// Claude Personal Assistant用エンドポイント
app.get('/api/pa/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT session_id) as total_sessions
      FROM conversation_messages
    `);
    
    res.json({
      totalMessages: parseInt(result.rows[0].total_messages),
      totalSessions: parseInt(result.rows[0].total_sessions),
      stressLevel: 25,
      emotionState: 'positive',
      lastActivity: new Date().toISOString()
    });
  } catch (error) {
    console.error('PA Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 自動分析機能（ここから追加） ==========

// 分析結果のキャッシュ
let analysisCache = {
  lastUpdate: null,
  stressLevel: 0,
  jobUrgency: 0,
  recommendations: []
};

// ストレス分析
async function analyzeStress() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as stress_count
      FROM conversation_messages
      WHERE created_at > NOW() - INTERVAL '7 days'
      AND (
        content ILIKE '%夜勤%' OR
        content ILIKE '%トラブル%' OR
        content ILIKE '%ストレス%' OR
        content ILIKE '%疲れ%'
      )
    `);
    
    const count = parseInt(result.rows[0].stress_count);
    return Math.min(100, count * 5);
  } catch (error) {
    console.error('Stress analysis error:', error);
    return 50;
  }
}

// 転職緊急度
async function analyzeJobUrgency() {
  const stress = await analyzeStress();
  return Math.min(100, Math.round(stress * 1.2));
}

// 自動分析実行
async function performAnalysis() {
  console.log('🔄 自動分析実行中...');
  
  const stress = await analyzeStress();
  const urgency = await analyzeJobUrgency();
  
  const recommendations = [];
  if (stress > 70) {
    recommendations.push('休息を優先してください');
    recommendations.push('ストレス解消法を実践しましょう');
  }
  if (urgency > 70) {
    recommendations.push('転職活動を開始しましょう');
    recommendations.push('ポートフォリオを準備してください');
  }
  if (recommendations.length === 0) {
    recommendations.push('現在は良好な状態です');
  }
  
  analysisCache = {
    lastUpdate: new Date().toISOString(),
    stressLevel: stress,
    jobUrgency: urgency,
    recommendations: recommendations
  };
  
  console.log('✅ 分析完了:', { stress, urgency });
  return analysisCache;
}

// 自動分析エンドポイント
app.get('/api/auto-analysis', (req, res) => {
  console.log('📥', new Date().toISOString(), '- GET /api/auto-analysis');
  res.json(analysisCache);
});

app.post('/api/analyze-now', async (req, res) => {
  console.log('📥', new Date().toISOString(), '- POST /api/analyze-now');
  const result = await performAnalysis();
  res.json(result);
});

// 統合ダッシュボードエンドポイント
app.get('/api/dashboard', async (req, res) => {
  console.log('📥', new Date().toISOString(), '- GET /api/dashboard');
  
  if (!analysisCache.lastUpdate) {
    await performAnalysis();
  }
  
  try {
    const messageCount = await pool.query('SELECT COUNT(*) FROM conversation_messages');
    const sessionCount = await pool.query('SELECT COUNT(DISTINCT session_id) FROM conversation_messages');
    
    res.json({
      totalMessages: parseInt(messageCount.rows[0].count),
      totalSessions: parseInt(sessionCount.rows[0].count),
      ...analysisCache
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5分ごとに自動実行
setInterval(performAnalysis, 300000);

// 初回実行（3秒後）
setTimeout(performAnalysis, 3000);

console.log('✅ 自動分析機能を開始しました（5分ごと）');

// ========== 自動分析機能（ここまで） ==========
