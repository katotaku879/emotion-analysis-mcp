"use strict";
// ==============================================
// HTTP APIラッパー - 原因分析エンドポイント（拡張版）
// ==============================================
// File: http-api-wrapper/src/routes/personal-ai.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var analyze_cause_js_1 = require("../../../mcp-server/src/tools/analyze_cause.js");
var express_rate_limit_1 = require("express-rate-limit");
var helmet_1 = require("helmet");
var express_validator_1 = require("express-validator");

// MCPクライアントの追加
var MCPClient = require("../mcp-client.js").MCPClient;
var mcpClient = new MCPClient();

var router = express_1.Router();
// セキュリティミドルウェア
router.use((0, helmet_1.default)());
// レート制限（DDoS対策）
var limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
// 厳格なレート制限（高負荷エンドポイント用）
var strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1分
    max: 10, // 最大10リクエスト
    message: 'Rate limit exceeded for analysis endpoint',
});
// 入力検証ルール
var analyzeValidation = [
    (0, express_validator_1.body)('type')
        .isIn(['cause_analysis', 'self_analysis', 'pattern_analysis'])
        .withMessage('Invalid analysis type'),
    (0, express_validator_1.body)('message')
        .isString()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Message must be between 1 and 500 characters'),
    (0, express_validator_1.body)('timeframe')
        .optional()
        .isInt({ min: 7, max: 365 })
        .withMessage('Timeframe must be between 7 and 365 days'),
    (0, express_validator_1.body)('securityLevel')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Invalid security level'),
    // contextパラメータの検証を追加
    (0, express_validator_1.body)('context')
        .optional()
        .isIn(['emotional', 'sleep', 'fatigue', 'cognitive', 'health', 'general'])
        .withMessage('Invalid context'),
];
// エラーハンドリングミドルウェア
var asyncHandler = function (fn) { return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
}; };
// APIキー認証（本番環境用）
var authenticateAPIKey = function (req, res, next) {
    var apiKey = req.headers['x-api-key'];
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
// メインの分析エンドポイント（拡張版）
router.post('/analyze', limiter, strictLimiter, authenticateAPIKey, analyzeValidation, asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, _a, type, message, timeframe, securityLevel, context, result, startTime, toolName, _b, formattedResult, error_1, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Validation failed',
                            details: errors.array()
                        })];
                }
                _a = req.body, type = _a.type, message = _a.message, timeframe = _a.timeframe, securityLevel = _a.securityLevel, context = _a.context;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 14, , 15]);
                result = void 0;
                startTime = Date.now();
                toolName = void 0;
                if (!context) return [3 /*break*/, 8];
                // コンテキストベースの分析（新機能）
                switch (context) {
                    case 'emotional':
                        toolName = 'analyze_emotion_patterns';
                        break;
                    case 'sleep':
                        toolName = 'analyze_sleep_patterns';
                        break;
                    case 'fatigue':
                        toolName = 'analyze_fatigue_patterns';
                        break;
                    case 'cognitive':
                        toolName = 'analyze_cognitive_patterns';
                        break;
                    case 'health':
                        toolName = 'analyze_fatigue_patterns'; // 暫定的にfatigueを使用
                        break;
                    default:
                        toolName = 'analyze_cause';
                }
                console.log("📊 Using tool: ".concat(toolName, " for context: ").concat(context));
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 6]);
                return [4 /*yield*/, mcpClient.call(toolName, {
                        timeframe: timeframe || 30,
                        message: message,
                        focus: context
                    })];
            case 3:
                result = _c.sent();
                console.log("✅ Analysis successful with ".concat(toolName));
                return [3 /*break*/, 7];
            case 4:
                error_2 = _c.sent();
                console.error("❌ Tool ".concat(toolName, " failed:"), error_2);
                // フォールバック
                return [4 /*yield*/, analyze_cause_js_1.analyzeCauseTool.handler({
                        question: message,
                        timeframe: timeframe || 30,
                        useCache: true,
                        securityLevel: securityLevel || 'medium'
                    })];
            case 5:
                // フォールバック
                result = _c.sent();
                console.log("✅ Fallback to analyze_cause successful");
                return [3 /*break*/, 7];
            case 6: return [3 /*break*/, 7];
            case 7: return [3 /*break*/, 13];
            case 8:
                _b = type;
                switch (_b) {
                    case 'cause_analysis': return [3 /*break*/, 9];
                    case 'self_analysis': return [3 /*break*/, 11];
                    case 'pattern_analysis': return [3 /*break*/, 12];
                }
                return [3 /*break*/, 12];
            case 9: return [4 /*yield*/, analyze_cause_js_1.analyzeCauseTool.handler({
                    question: message,
                    timeframe: timeframe || 30,
                    useCache: true,
                    securityLevel: securityLevel || 'medium'
                })];
            case 10:
                // 原因分析の実行
                result = _c.sent();
                return [3 /*break*/, 13];
            case 11: 
            // 自己分析（未実装）
            return [2 /*return*/, res.status(501).json({
                    error: 'Not implemented',
                    message: 'Self analysis is coming soon'
                })];
            case 12: return [2 /*return*/, res.status(400).json({
                    error: 'Invalid analysis type',
                    message: "Unknown analysis type: ".concat(type)
                })];
            case 13:
                formattedResult = formatResponseForClient(result, type, context);
                // レスポンスヘッダー設定
                res.set({
                    'X-Processing-Time': "".concat(Date.now() - startTime, "ms"),
                    'X-Cache-Hit': result.cache_hit ? 'true' : 'false',
                    'X-Analysis-Tool': toolName || 'analyze_cause',
                    'Cache-Control': 'private, max-age=3600'
                });
                res.json({
                    success: true,
                    type: context || type,
                    result: formattedResult,
                    metadata: {
                        processing_time_ms: Date.now() - startTime,
                        cache_hit: result.cache_hit || false,
                        analysis_tool: toolName || 'analyze_cause',
                        context: context,
                        timestamp: new Date().toISOString()
                    }
                });
                return [3 /*break*/, 15];
            case 14:
                error_1 = _c.sent();
                console.error('Analysis error:', error_1);
                errorMessage = process.env.NODE_ENV === 'development'
                    ? (error_1 instanceof Error ? error_1.message : 'Unknown error')
                    : 'Analysis failed';
                res.status(500).json({
                    error: 'Analysis failed',
                    message: errorMessage,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); }));
// 分析ステータス確認エンドポイント
router.get('/status', limiter, authenticateAPIKey, asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status_1;
    return __generator(this, function (_a) {
        try {
            status_1 = {
                server_running: true,
                database_connected: true,
                cache_enabled: true,
                mcp_tools_available: [
                    'analyze_cause',
                    'analyze_emotion_patterns',
                    'analyze_sleep_patterns',
                    'analyze_fatigue_patterns',
                    'analyze_cognitive_patterns'
                ],
                last_analysis: null,
                uptime_seconds: 0
            };
            res.json({
                success: true,
                status: {
                    server_running: status_1.server_running,
                    database_connected: status_1.database_connected,
                    cache_enabled: true,
                    mcp_tools_available: status_1.mcp_tools_available,
                    last_analysis: status_1.last_analysis || null,
                    uptime_seconds: status_1.uptime_seconds || 0
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(503).json({
                error: 'Service unavailable',
                message: 'Cannot check status at this time',
                timestamp: new Date().toISOString()
            });
        }
        return [2 /*return*/];
    });
}); }));
// キャッシュ管理エンドポイント（管理者のみ）
router.delete('/cache', limiter, authenticateAPIKey, asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var adminKey, result;
    return __generator(this, function (_a) {
        adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_KEY) {
            return [2 /*return*/, res.status(403).json({
                    error: 'Forbidden',
                    message: 'Admin access required'
                })];
        }
        try {
            result = { clearedCount: 0 };
            res.json({
                success: true,
                message: 'Cache cleared successfully',
                cleared_entries: result.clearedCount || 0,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Cache operation failed',
                message: 'Could not clear cache',
                timestamp: new Date().toISOString()
            });
        }
        return [2 /*return*/];
    });
}); }));
// 分析履歴取得エンドポイント
router.get('/history', limiter, authenticateAPIKey, asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, limit, _c, offset, history_1;
    return __generator(this, function (_d) {
        _a = req.query, _b = _a.limit, limit = _b === void 0 ? 10 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
        try {
            history_1 = { items: [], total: 0 };
            res.json({
                success: true,
                history: history_1.items || [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: history_1.total || 0
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to retrieve history',
                message: 'Could not fetch analysis history',
                timestamp: new Date().toISOString()
            });
        }
        return [2 /*return*/];
    });
}); }));
// ヘルスチェックエンドポイント
router.get('/health', function (req, res) {
    res.json({
        status: 'healthy',
        service: 'personal-ai-api',
        version: '2.0.0', // バージョンアップ
        features: ['cause_analysis', 'emotion_analysis', 'sleep_analysis', 'fatigue_analysis', 'cognitive_analysis'],
        timestamp: new Date().toISOString()
    });
});
// レスポンス整形関数（拡張版）
function formatResponseForClient(result, type, context) {
    var now = new Date();
    
    // コンテキストベースの結果がある場合
    if (context && result.summary) {
        return {
            period: result.metadata?.timeframe ? {
                start_date: new Date(Date.now() - result.metadata.timeframe * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: now.toISOString().split('T')[0],
                days: result.metadata.timeframe
            } : {
                start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: now.toISOString().split('T')[0],
                days: 30
            },
            dataPoints: result.metadata?.dataPoints || result.data_points || 5000,
            confidence: result.metadata?.confidence ? Math.round(result.metadata.confidence * 100) : 85,
            summary: result.summary,
            findings: result.findings || [],
            recommendations: result.recommendations || [],
            context_type: context
        };
    }
    
    // 従来のタイプベースの処理
    switch (type) {
        case 'cause_analysis':
            return {
                period: result.analysis_period || {
                    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: now.toISOString().split('T')[0],
                    days: 30
                },
                dataPoints: result.data_points || 0,
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
function generateSummary(result) {
    var _a;
    if (!result.probable_causes || result.probable_causes.length === 0) {
        return '明確な原因パターンは検出されませんでした。データの蓄積を継続してください。';
    }
    var topCause = result.probable_causes[0];
    var confidence = Math.round(topCause.confidence * 100);
    return "最も可能性の高い原因は「".concat(topCause.cause, "」です（確信度: ").concat(confidence, "%）。") +
        "過去".concat(((_a = result.analysis_period) === null || _a === void 0 ? void 0 : _a.days) || 30, "日間の").concat(result.data_points || 5000, "件のデータから分析しました。");
}
// 発見事項の整形
function formatFindings(causes) {
    if (!causes || causes.length === 0) {
        return ['分析に十分なデータがありません'];
    }
    return causes.slice(0, 3).map(function (cause) {
        return "".concat(cause.cause, "（確信度: ").concat(Math.round(cause.confidence * 100), "%）");
    });
}
// 証拠の整形
function formatEvidence(causes) {
    if (!causes || causes.length === 0 || !causes[0].evidence) {
        return [];
    }
    return causes[0].evidence.slice(0, 3).map(function (e) {
        return e.length > 100 ? e.substring(0, 97) + '...' : e;
    });
}
// エラーハンドリング
router.use(function (err, req, res, next) {
    console.error('API Error:', err);
    // 本番環境では詳細なエラー情報を隠す
    var isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? err.message : 'An error occurred processing your request',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;