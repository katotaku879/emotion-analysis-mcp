import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import fs from 'fs';
const { Pool } = pkg;

const app = express();

// シークレットを読み取る関数
function readSecret(filename) {
  try {
    return fs.readFileSync(`/run/secrets/${filename}`, 'utf8').trim();
  } catch (error) {
    console.error(`Failed to read secret ${filename}:`, error);
    // フォールバック（開発環境用）
    return process.env[`DB_${filename.toUpperCase()}`] || '';
  }
}

// データベース接続（シークレット使用）
const pool = new Pool({
  user: readSecret('db_user'),
  password: readSecret('db_password'),
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'emotion_analysis',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// 既存のコードをコピー...