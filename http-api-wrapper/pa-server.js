import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'pa-server',
        timestamp: new Date().toISOString() 
    });
});

const PORT = 3333;

// PAサーバーのエンドポイント
app.get('/api/pa/stats', (req, res) => {
  res.json({
    totalMessages: 38373,
    stressLevel: 45,
    jobUrgency: 65,
    jobReadiness: 40,
    mainStressor: '夜勤・トラブル対応',
    stressAdvice: '休息を優先してください',
    careerAdvice: 'ポートフォリオを準備',
    lastSave: new Date().toISOString()
  });
});

app.get('/api/pa/stress', (req, res) => {
  res.json({
    level: 45,
    factors: ['夜勤', 'トラブル対応', '人間関係'],
    recommendations: ['十分な睡眠', 'ストレス解消法の実践']
  });
});

app.get('/api/pa/job-readiness', (req, res) => {
  res.json({
    urgency: 65,
    readiness: 40,
    recommendations: ['スキルシート作成', '職務経歴書準備', 'GitHub整理']
  });
});

console.log(`🚀 PA Server starting on port ${PORT}...`);

app.listen(PORT, () => {
  console.log(`✅ PA Server running on http://localhost:${PORT}`);
  console.log('📍 Endpoints:');
  console.log('  - GET /api/pa/stats');
  console.log('  - GET /api/pa/stress');
  console.log('  - GET /api/pa/job-readiness');
});
