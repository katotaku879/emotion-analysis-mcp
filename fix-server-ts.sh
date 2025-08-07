#!/bin/bash

echo "🔧 server.tsを修正中..."

# バックアップ作成
cp http-api-wrapper/src/server.ts http-api-wrapper/src/server.ts.backup

# ファイルを修正（パスワード部分を環境変数のみに）
cat > http-api-wrapper/src/server.ts.tmp << 'TYPESCRIPT'
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const app = express();
const port = 3000;
const host = '0.0.0.0';

// 🗄️ PostgreSQL接続設定（環境変数から取得）
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'emotion_analysis',
  user: process.env.DB_USER || 'mkykr',
  password: process.env.DB_PASSWORD,  // 環境変数からのみ取得
});

// 🌐 CORS設定
app.use(cors({
  origin: ['https://claude.ai', 'https://*.claude.ai', 'http://localhost:3000','chrome-extension://*'],
  credentials: true
}));
app.use(express.json());
TYPESCRIPT

# 残りの部分を追加（最初の30行以降）
tail -n +31 http-api-wrapper/src/server.ts >> http-api-wrapper/src/server.ts.tmp

# ファイルを置き換え
mv http-api-wrapper/src/server.ts.tmp http-api-wrapper/src/server.ts

echo "✅ server.tsを修正しました"
