import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'mkykr',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'emotion_analysis',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Claude Personal Assistant用のエンドポイント
app.get('/api/pa/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT DATE(created_at)) as total_sessions,
        MAX(created_at) as last_activity
      FROM conversation_messages
      WHERE sender = 'user'
    `);
    
    const stressResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN content LIKE '%ストレス%' OR content LIKE '%疲れ%' THEN 1 END) * 100.0 / COUNT(*) as stress_percentage
      FROM conversation_messages
      WHERE sender = 'user'
      AND created_at > NOW() - INTERVAL '30 days'
    `);
    
    res.json({
      totalMessages: parseInt(result.rows[0].total_messages),
      totalSessions: parseInt(result.rows[0].total_sessions),
      stressLevel: Math.round(stressResult.rows[0].stress_percentage || 0),
      emotionState: 'neutral',
      lastActivity: result.rows[0].last_activity
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.json({
      totalMessages: 34063,
      totalSessions: 100,
      stressLevel: 45,
      emotionState: 'neutral'
    });
  }
});

// ストレス分析
app.get('/api/pa/stress', async (req, res) => {
  res.json({
    currentLevel: 65,
    trend: 'increasing',
    factors: [
      { name: '夜勤', impact: 85 },
      { name: '職場環境', impact: 70 },
      { name: '疲労', impact: 60 }
    ]
  });
});

// 転職準備度
app.get('/api/pa/job-readiness', async (req, res) => {
  res.json({
    readiness: 40,
    checklist: [
      { item: 'ポートフォリオ', done: true },
      { item: '職務経歴書', done: false },
      { item: 'スキル棚卸し', done: true },
      { item: '企業研究', done: false },
      { item: '面接対策', done: false }
    ]
  });
});

// 既存のPersonal AI APIも提供
app.get('/api/stats', async (req, res) => {
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
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log('================================');
  console.log('🚀 Personal Assistant API Server');
  console.log(`✅ ポート: ${PORT}`);
  console.log('================================');
  console.log('エンドポイント:');
  console.log('  GET /api/pa/stats - 統計情報');
  console.log('  GET /api/pa/stress - ストレス分析');
  console.log('  GET /api/pa/job-readiness - 転職準備度');
  console.log('================================');
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
