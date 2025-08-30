import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// 本番環境では環境変数を必須にする
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is required in production');
}

if (!process.env.DB_USER) {
  throw new Error('DB_USER is required in production');
}

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'emotion_analysis',
  password: process.env.DB_PASSWORD,  // フォールバックなし
  port: parseInt(process.env.DB_PORT || '5432'),
});
