import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Personal AIツールをインポート
import { analyze_cause } from './dist/tools/personal-ai/analyze_cause.js';
import { self_profile } from './dist/tools/personal-ai/self_profile.js';
import { emotion_patterns } from './dist/tools/personal-ai/emotion_patterns.js';
import { behavior_prediction } from './dist/tools/personal-ai/behavior_prediction.js';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

// ツールマップ
const tools = {
  analyze_cause,
  self_profile,
  emotion_patterns,
  behavior_prediction
};

// 汎用エンドポイント
app.post('/analyze', async (req, res) => {
  try {
    const { tool, parameters } = req.body;
    console.log(`📊 ツール実行: ${tool}`);
    
    if (!tools[tool]) {
      return res.status(404).json({ error: `Tool not found: ${tool}` });
    }
    
    const result = await tools[tool].handler(parameters || {});
    res.json(result);
    
  } catch (error) {
    console.error(`❌ エラー (${req.body.tool}):`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'MCP HTTP Server',
    availableTools: Object.keys(tools)
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('================================');
  console.log('🚀 MCP HTTP Server');
  console.log('================================');
  console.log(`✅ ポート: ${PORT}`);
  console.log(`✅ 利用可能なツール:`);
  Object.keys(tools).forEach(tool => {
    console.log(`   - ${tool}`);
  });
  console.log('================================');
});
