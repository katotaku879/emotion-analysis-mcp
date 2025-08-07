const dotenv = require('dotenv');
dotenv.config();

// migration/config.js
module.exports = {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'emotion_analysis',
    user: 'mkykr',
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  paths: {
    jsonData: '/mnt/c/Users/mkykr/Pythonプログラム/自己肯定アプリ/streamlit_app.py/emotion_logs_fixed.json',
    logs: './logs'
  },
  processing: {
    batchSize: 50,
    errorThresholds: {
      fatalErrorRate: 0,
      errorRate: 0.05,
      consecutiveErrors: 10,
      batchErrorRate: 0.50
    }
  },
  logging: {
    level: 'INFO',
    toConsole: true,
    toFile: true
  }
};
