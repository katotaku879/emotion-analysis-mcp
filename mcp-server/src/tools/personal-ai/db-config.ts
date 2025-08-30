import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);

// 環境に応じて.envファイルを読み込み
const envPath = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env';

// 複数の場所から.envを探す
dotenv.config({ path: path.resolve(__dirname, '../../../../', envPath) });
dotenv.config({ path: path.resolve(__dirname, '../../../', envPath) });

// 環境変数のバリデーション
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 必須の環境変数が設定されていません:', missingVars.join(', '));
  
  if (process.env.NODE_ENV === 'production') {
    // 本番環境では例外を投げる
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  } else {
    // 開発環境では警告のみ
    console.warn('⚠️  開発環境のため続行しますが、本番環境では失敗します');
  }
}

// データベース接続設定
const config = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  
  // 本番環境向けの追加設定
  ...(process.env.NODE_ENV === 'production' && {
    ssl: {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    },
    max: 20,                    // 最大接続数
    idleTimeoutMillis: 30000,   // アイドルタイムアウト
    connectionTimeoutMillis: 2000, // 接続タイムアウト
  })
};

// パスワードが設定されていない場合の最終チェック
if (!config.password) {
  const errorMessage = 'データベースパスワードが設定されていません';
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMessage);
  } else {
    console.error(`❌ ${errorMessage}`);
    // 開発環境のみ：ローカルのデフォルト値を使用（非推奨）
    console.warn('⚠️  開発環境のため、セキュリティリスクを承知で続行します');
  }
}

export const pool = new Pool(config);

// 接続エラーハンドリング
pool.on('error', (err) => {
  console.error('予期しないデータベースエラー:', err);
  if (process.env.NODE_ENV === 'production') {
    // 本番環境では通知やログ記録を行う
    // notifyAdmin(err);
    process.exit(-1);
  }
});

// 接続テスト（起動時）
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ データベース接続失敗:', err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  } else {
    console.log('✅ データベース接続成功:', res.rows[0].now);
  }
});

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  console.log('接続プールを終了しています...');
  await pool.end();
  process.exit(0);
});
