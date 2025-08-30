// 環境変数の検証ユーティリティ

interface EnvConfig {
  DB_USER: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  NODE_ENV?: string;
}

export function validateEnv(): EnvConfig {
  const required = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please ensure all required variables are set in your .env file or environment.`
    );
  }
  
  return {
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_NAME: process.env.DB_NAME!,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
}

// 環境変数のマスク表示（ログ用）
export function maskSensitiveData(config: EnvConfig): any {
  return {
    ...config,
    DB_PASSWORD: config.DB_PASSWORD ? '***' : 'NOT SET',
  };
}
