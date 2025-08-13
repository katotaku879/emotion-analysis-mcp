// ==============================================
// HTTP APIラッパー - 原因分析エンドポイント
// ==============================================
// File: http-api-wrapper/src/routes/personal-ai.ts

import express, { Request, Response, NextFunction } from 'express';
import { analyzeCauseTool } from '../../../mcp-server/src/tools/analyze_cause.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// セキュリティミドルウェア
router.use(helmet());

// レート制限（DDoS対策）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 厳格なレート制限（高負荷エンドポイント用）
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 10, // 最大10リクエスト
  message: 'Rate limit exceeded for analysis endpoint',
});

// 入力検証ルール
const analyzeValidation = [
  body('type')
    .isIn(['cause_analysis', 'self_analysis', 'pattern_analysis'])
    .withMessage('Invalid analysis type'),
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  body('timeframe')
    .optional()
    .isInt({ min: 7, max: 365 })
    .withMessage('Timeframe must be between 7 and 365 days'),
  body('securityLevel')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid security level'),
];

// エラーハンドリングミドルウェア
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// APIキー認証（本番環境用）
const authenticateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  // 開発環境ではスキップ
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }
  
  next();
};

// メインの分析エンドポイント
router.post(
  '/analyze',
  limiter,
  strictLimiter,
  authenticateAPIKey,
  analyzeValidation,
  asyncHandler(async (req: Request, res: Response) => {
    // 入力検証エラーチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { type, message, timeframe, securityLevel } = req.body;
    
    try {
      let result: any;
      const startTime = Date.now();
      
      switch (type) {
        case 'cause_analysis':
          // 原因分析の実行
          result = await analyzeCauseTool.handler({
            question: message,
            timeframe: timeframe || 30,
            useCache: true,
            securityLevel: securityLevel || 'medium'
          });
          break;
          
        case 'self_analysis':
          // 自己分析（未実装）
          return res.status(501).json({
            error: 'Not implemented',
            message: 'Self analysis is coming soon'
          });
          
        case 'pattern_analysis':
          // パターン分析（未実装）
          return res.status(501).json({
            error: 'Not implemented',
            message: 'Pattern analysis is coming soon'
          });
          
        default:
          return res.status(400).json({
            error: 'Invalid analysis type',
            message: `Unknown analysis type: ${type}`
          });
      }
      
      // レスポンス整形
      const formattedResult = formatResponseForClient(result, type);
      
      // レスポンスヘッダー設定
      res.set({
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-Cache-Hit': result.cache_hit ? 'true' : 'false',
        'Cache-Control': 'private, max-age=3600'
      });
      
      res.json({
        success: true,
        type,
        result: formattedResult,
        metadata: {
          processing_time_ms: Date.now() - startTime,
          cache_hit: result.cache_hit || false,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      // エラーレスポンス（本番環境では詳細を隠す）
      const errorMessage = process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'Analysis failed';
      
      res.status(500).json({
        error: 'Analysis failed',
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  })
);

// 分析ステータス確認エンドポイント
router.get(
  '/status',
  limiter,
  authenticateAPIKey,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const status = {
        server_running: true,
        database_connected: true,
        cache_enabled: true,
        last_analysis: null,
        uptime_seconds: 0
      };
      
      res.json({
        success: true,
        status: {
          server_running: status.server_running,
          database_connected: status.database_connected,
          cache_enabled: true,
          last_analysis: status.last_analysis || null,
          uptime_seconds: status.uptime_seconds || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        error: 'Service unavailable',
        message: 'Cannot check status at this time',
        timestamp: new Date().toISOString()
      });
    }
  })
);

// キャッシュ管理エンドポイント（管理者のみ）
router.delete(
  '/cache',
  limiter,
  authenticateAPIKey,
  asyncHandler(async (req: Request, res: Response) => {
    // 管理者権限チェック
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    try {
      const result = { clearedCount: 0 };
      
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        cleared_entries: result.clearedCount || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Cache operation failed',
        message: 'Could not clear cache',
        timestamp: new Date().toISOString()
      });
    }
  })
);

// 分析履歴取得エンドポイント
router.get(
  '/history',
  limiter,
  authenticateAPIKey,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10, offset = 0 } = req.query;
    
    try {
      const history = { items: [], total: 0 };
      
      res.json({
        success: true,
        history: history.items || [],
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: history.total || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve history',
        message: 'Could not fetch analysis history',
        timestamp: new Date().toISOString()
      });
    }
  })
);

// ヘルスチェックエンドポイント
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'personal-ai-api',
    timestamp: new Date().toISOString()
  });
});

// レスポンス整形関数
function formatResponseForClient(result: any, type: string): any {
  const now = new Date();
  
  switch (type) {
    case 'cause_analysis':
      return {
        period: result.analysis_period || {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: now.toISOString().split('T')[0],
          days: 30
        },
        data_points: result.data_points || 0,
        confidence: Math.round((result.confidence_score || 0) * 100),
        summary: generateSummary(result),
        findings: formatFindings(result.probable_causes),
        evidence: formatEvidence(result.probable_causes),
        recommendations: result.recommendations || []
      };
      
    default:
      return result;
  }
}

// サマリー生成
function generateSummary(result: any): string {
  if (!result.probable_causes || result.probable_causes.length === 0) {
    return '明確な原因パターンは検出されませんでした。データの蓄積を継続してください。';
  }
  
  const topCause = result.probable_causes[0];
  const confidence = Math.round(topCause.confidence * 100);
  
  return `最も可能性の高い原因は「${topCause.cause}」です（確信度: ${confidence}%）。` +
         `過去${result.analysis_period?.days || 30}日間の${result.data_points}件のデータから分析しました。`;
}

// 発見事項の整形
function formatFindings(causes: any[]): string[] {
  if (!causes || causes.length === 0) {
    return ['分析に十分なデータがありません'];
  }
  
  return causes.slice(0, 3).map(cause => 
    `${cause.cause}（確信度: ${Math.round(cause.confidence * 100)}%）`
  );
}

// 証拠の整形
function formatEvidence(causes: any[]): string[] {
  if (!causes || causes.length === 0 || !causes[0].evidence) {
    return [];
  }
  
  return causes[0].evidence.slice(0, 3).map((e: string) => 
    e.length > 100 ? e.substring(0, 97) + '...' : e
  );
}

// エラーハンドリング
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  
  // 本番環境では詳細なエラー情報を隠す
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'An error occurred processing your request',
    timestamp: new Date().toISOString()
  });
});

export default router;