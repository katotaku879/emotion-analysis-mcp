import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3333;  // 別のポートを使用

app.use(cors());
app.use(express.json());

const SAVE_DIR = './saved-messages';

// ディレクトリ作成
await fs.mkdir(SAVE_DIR, { recursive: true });

// メッセージ保存エンドポイント
app.post('/api/messages', async (req, res) => {
  try {
    const { role, content } = req.body;
    const timestamp = new Date().toISOString();
    const filename = `${timestamp.replace(/[:.]/g, '-')}-${role}.json`;
    
    await fs.writeFile(
      path.join(SAVE_DIR, filename),
      JSON.stringify({ role, content, timestamp }, null, 2)
    );
    
    console.log(`✅ Saved ${role} message at ${timestamp}`);
    res.json({ success: true, saved: filename });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Simple Save Server', port: PORT });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`📝 Simple Save Server running on http://127.0.0.1:${PORT}`);
  console.log(`📁 Messages will be saved to: ${path.resolve(SAVE_DIR)}`);
});
