"use strict";
// Docker環境用 - 実際の分析ツールを使用
const { analyzeCauseTool } = require('../mcp-server/src/tools/analyze_cause.js');

// 新しい分析ツールをインポート
let analyzeEmotionPatternsTool, analyzeSleepPatternsTool, analyzeFatiguePatternsTool, analyzeCognitivePatternsTool;

try {
    analyzeEmotionPatternsTool = require('../mcp-server/dist/tools/analyze_emotion_patterns.js').analyzeEmotionPatternsTool;
    analyzeSleepPatternsTool = require('../mcp-server/dist/tools/analyze_sleep_patterns.js').analyzeSleepPatternsTool;
    analyzeFatiguePatternsTool = require('../app/tools/analyze_fatigue_patterns_fixed.js').analyzeFatiguePatternsTool;
    analyzeCognitivePatternsTool = require('../mcp-server/dist/tools/analyze_cognitive_patterns.js').analyzeCognitivePatternsTool;
    console.log('✅ All analysis tools loaded successfully');
} catch (error) {
    console.log('⚠️ Some analysis tools not available:', error.message);
}

class MCPClient {
    constructor(mcpServerPath) {
        // Docker環境では外部MCPサーバーを使わない
        this.mcpServerUrl = mcpServerPath ||
            process.env.MCP_SERVER_URL ||
            'http://host.docker.internal:3001';
        console.log('📡 MCP Client initialized (Docker mode - using actual analysis tools)');
    }
    
    async callTool(toolName, params) {
        // 外部MCPサーバーを呼ばずに、直接analyze_causeを使用
        return this.call(toolName, params);
    }
    
    async call(toolName, params) {
        try {
            const context = params.focus || params.context;
            console.log(`📊 Processing ${toolName} with context: ${context}`);
            
            let result;
            
            // コンテキストに応じて実際のツールを使用
            if (context === 'emotional' && analyzeEmotionPatternsTool) {
                console.log('🧠 Using actual analyze_emotion_patterns tool');
                result = await analyzeEmotionPatternsTool.handler({
                    timeframe: params.timeframe || 30,
                    focus: 'all'
                });
                // プレフィックスを追加
                if (result.summary && !result.summary.includes('【感情分析】')) {
                    result.summary = `【感情分析】${result.summary}`;
                }
                return result;
                
            } else if (context === 'sleep' && analyzeSleepPatternsTool) {
                console.log('😴 Using actual analyze_sleep_patterns tool');
                result = await analyzeSleepPatternsTool.handler({
                    timeframe: params.timeframe || 30
                });
                // プレフィックスを追加
                if (result.summary && !result.summary.includes('【睡眠分析】')) {
                    result.summary = `【睡眠分析】${result.summary}`;
                }
                return result;
                
            } else if (context === 'fatigue' && analyzeFatiguePatternsTool) {
                console.log('😫 Using actual analyze_fatigue_patterns tool');
                result = await analyzeFatiguePatternsTool.handler({
                    timeframe: params.timeframe || 30
                });
                // プレフィックスを追加
                if (result.summary && !result.summary.includes('【疲労分析】')) {
                    result.summary = `【疲労分析】${result.summary}`;
                }
                return result;
                
            } else if (context === 'cognitive' && analyzeCognitivePatternsTool) {
                console.log('🎯 Using actual analyze_cognitive_patterns tool');
                result = await analyzeCognitivePatternsTool.handler({
                    timeframe: params.timeframe || 30
                });
                // プレフィックスを追加
                if (result.summary && !result.summary.includes('【認知機能分析】')) {
                    result.summary = `【認知機能分析】${result.summary}`;
                }
                return result;
            }
            
            // フォールバック: 新しいツールが利用できない場合は analyze_cause を使用
            console.log('📊 Fallback to analyze_cause with context-specific prompt');
            
            let question = params.message || params.question;
            
            // コンテキストに応じてプロンプトを調整
            if (context === 'emotional') {
                question = params.message + ' 私の過去のデータから、ストレス、イライラ、不安、焦り、怒りなどの感情的な要因を重点的に分析してください。特に「イライラ」「ストレス」「ムカつく」「腹立つ」などのキーワードに注目してください。';
            } else if (context === 'sleep') {
                question = params.message + ' 私の過去のデータから、睡眠パターン、不眠、夜勤、深夜の活動、「眠れない」「寝れない」「睡眠不足」などのキーワードを重点的に分析してください。特に就寝時間と起床時間のパターンに注目してください。';
            } else if (context === 'fatigue') {
                question = params.message + ' 私の過去のデータから、身体的疲労と精神的疲労を分析してください。「疲れた」「だるい」「しんどい」「体調不良」「頭痛」などのキーワードと、その頻度や時間帯を重点的に見てください。';
            } else if (context === 'cognitive') {
                question = params.message + ' 私の過去のデータから、集中力、記憶力、判断力に関する問題を分析してください。「集中できない」「ミス」「忘れた」「頭が回らない」などのキーワードと、作業効率の変化を重点的に見てください。';
            }
            
            // analyze_causeを直接呼び出し
            result = await analyzeCauseTool.handler({
                question: question,
                timeframe: params.timeframe || 30,
                useCache: false,  // キャッシュを無効にして最新データを取得
                securityLevel: params.securityLevel || 'medium'
            });
            
            // コンテキストに応じてプレフィックスを追加（実際のデータを使用）
            if (context === 'emotional') {
                if (result.summary && !result.summary.includes('【感情分析】')) {
                    result.summary = `【感情分析】${result.summary}`;
                }
            } else if (context === 'sleep') {
                if (result.summary && !result.summary.includes('【睡眠分析】')) {
                    result.summary = `【睡眠分析】${result.summary}`;
                }
            } else if (context === 'fatigue') {
                if (result.summary && !result.summary.includes('【疲労分析】')) {
                    result.summary = `【疲労分析】${result.summary}`;
                }
            } else if (context === 'cognitive') {
                if (result.summary && !result.summary.includes('【認知機能分析】')) {
                    result.summary = `【認知機能分析】${result.summary}`;
                }
            }
            
            // probable_causesがあればfindingsに変換
            if (result.probable_causes && result.probable_causes.length > 0) {
                result.findings = result.probable_causes.map(c => 
                    `${c.cause}（確信度: ${Math.round(c.confidence * 100)}%）`
                );
            }
            
            console.log('✅ Analysis completed successfully');
            console.log(`   Context: ${context || 'general'}`);
            console.log(`   Tool used: ${analyzeEmotionPatternsTool && context === 'emotional' ? 'analyze_emotion_patterns' : 'analyze_cause'}`);
            console.log(`   Findings: ${result.findings ? result.findings.length : 0} items`);
            console.log(`   Data points: ${result.metadata?.dataPoints || result.data_points || 'N/A'}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            throw error;
        }
    }
    
    async getServerStatus() {
        return {
            running: true,
            databaseConnected: true,
            lastAnalysis: new Date().toISOString(),
            uptime: process.uptime()
        };
    }
    
    async clearAnalysisCache() {
        return { clearedCount: 0 };
    }
    
    async getAnalysisHistory(params) {
        return { items: [], total: 0 };
    }
}

// CommonJS形式でエクスポート
exports.MCPClient = MCPClient;
module.exports = { MCPClient };