import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// /api/messages のリクエストをポート3333にプロキシ
app.use('/api/messages', createProxyMiddleware({
  target: 'http://127.0.0.1:3333',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📡 Proxying ${req.method} /api/messages to port 3333`);
  }
}));

// その他のリクエストは元のAPIサーバーへ
app.use('/', createProxyMiddleware({
  target: 'http://127.0.0.1:3000',
  changeOrigin: true
}));

app.listen(3000, '127.0.0.1', () => {
  console.log('🔄 Proxy server running on 127.0.0.1:3000');
  console.log('   → /api/messages goes to :3333');
  console.log('   → other requests go to original :3000');
});
