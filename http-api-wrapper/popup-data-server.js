import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors({ origin: '*' }));

const pool = new Pool({
  user: process.env.DB_USER || 'mkykr',
  host: 'localhost',
  database: process.env.DB_NAME || 'emotion_analysis',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// データを提供するJavaScriptファイル
app.get('/dashboard.js', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as messages FROM conversation_messages WHERE sender = 'user'
    `);
    
    const data = {
      totalMessages: parseInt(result.rows[0].messages),
      totalSessions: 3,
      stressLevel: 45,
      emotionState: 'neutral',
      jobReadiness: 40
    };
    
    // JavaScriptコードとして返す
    res.type('application/javascript');
    res.send(`
      // Dashboard Data Injection
      (function() {
        window.dashboardData = ${JSON.stringify(data)};
        console.log('📊 Data loaded:', window.dashboardData);
        
        // メッセージ数を更新
        const messageElements = document.querySelectorAll('*');
        let updated = 0;
        
        messageElements.forEach(el => {
          if (el.tagName === 'H2' && el.textContent === '0') {
            if (el.parentElement && el.parentElement.textContent.includes('メッセージ')) {
              el.textContent = window.dashboardData.totalMessages.toLocaleString();
              updated++;
            }
            if (el.parentElement && el.parentElement.textContent.includes('セッション')) {
              el.textContent = window.dashboardData.totalSessions;
              updated++;
            }
          }
        });
        
        // ストレスレベルのテキストを更新
        const stressElements = document.querySelectorAll('*');
        stressElements.forEach(el => {
          if (el.textContent === '-' && el.parentElement && el.parentElement.textContent.includes('ストレス')) {
            el.textContent = '中';
          }
        });
        
        // 進捗バーを更新
        const progressBars = document.querySelectorAll('[role="progressbar"], .bg-green-500, .bg-red-500');
        progressBars.forEach(bar => {
          if (bar.parentElement && bar.parentElement.textContent.includes('準備')) {
            bar.style.width = window.dashboardData.jobReadiness + '%';
          }
        });
        
        console.log('✅ Updated ' + updated + ' elements');
        
        // 感情状態を設定
        const emotionEl = document.querySelector('.text-2xl');
        if (emotionEl && emotionEl.textContent === '😐') {
          emotionEl.textContent = '😊';
        }
      })();
    `);
  } catch (error) {
    console.error('Error:', error);
    res.type('application/javascript');
    res.send(`console.error('Failed to load data: ${error.message}');`);
  }
});

// 簡易HTMLテストページ
app.get('/test', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Dashboard Data Test</h1>
        <div id="messages">Messages: <span>0</span></div>
        <div id="sessions">Sessions: <span>0</span></div>
        <script src="http://localhost:4444/dashboard.js"></script>
      </body>
    </html>
  `);
});

const PORT = 4444;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📊 Popup Data Server running on http://localhost:${PORT}`);
  console.log(`   - http://localhost:${PORT}/dashboard.js (JSONP data)`);
  console.log(`   - http://localhost:${PORT}/test (Test page)`);
});
