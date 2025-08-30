import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
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
    const filename = `${timestamp.replace(/[:.]/g, '-')}.json`;
    
    await fs.writeFile(
      path.join(SAVE_DIR, filename),
      JSON.stringify({ role, content, timestamp }, null, 2)
    );
    
    console.log(`✅ Saved ${role} message`);
    res.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, '127.0.0.1', () => {
  console.log('📝 Simple Save Server running on 127.0.0.1:3000');
});
