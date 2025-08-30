import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// セキュリティミドルウェア
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS設定（厳格）
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'https://claude.ai',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// レート制限
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// より厳しい制限（認証エンドポイント）
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
});
app.use('/api/auth/', authLimiter);

// JSONパース（サイズ制限）
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQLインジェクション対策
app.use(mongoSanitize());

// 入力検証ミドルウェア
const validateInput = [
    body('tool').isString().isLength({ min: 1, max: 50 }).trim().escape(),
    body('parameters.period').optional().isString().matches(/^\d+ (days?|months?|years?)$/),
    body('parameters.includeSystemMessages').optional().isBoolean(),
];

// JWTシークレット読み込み
const JWT_SECRET = fs.readFileSync(process.env.JWT_SECRET_FILE || 'secrets/jwt_secret.txt', 'utf8').trim();

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// エラーハンドリング
app.use((err, req, res, next) => {
    // ログに記録（本番環境では外部サービスへ）
    console.error(err.stack);
    
    // エラー詳細を隠蔽
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;
    
    res.status(err.status || 500).json({ 
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// セキュアなシャットダウン
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// HTTPS対応（本番環境）
if (process.env.NODE_ENV === 'production') {
    const httpsOptions = {
        key: fs.readFileSync('./ssl/key.pem'),
        cert: fs.readFileSync('./ssl/cert.pem')
    };
    https.createServer(httpsOptions, app).listen(443);
}

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🔒 Secure API Server running on port ${PORT}`);
});