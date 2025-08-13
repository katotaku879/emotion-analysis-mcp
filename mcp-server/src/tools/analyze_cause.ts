// ==============================================
// 原因分析ツール - MCPサーバー実装
// ==============================================
// File: mcp-server/src/tools/analyze_cause.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from '../database.js';
import crypto from 'crypto';

// 型定義
interface CauseAnalysisParams {
  question: string;
  timeframe?: number;
  useCache?: boolean;
  securityLevel?: 'low' | 'medium' | 'high';
}

interface ProbableCause {
  cause: string;
  confidence: number;
  evidence: string[];
  timeline: string[];
  keywords: string[];
}

interface CauseAnalysisResult {
  question: string;
  analysis_period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  data_points: number;
  probable_causes: ProbableCause[];
  recommendations: string[];
  confidence_score: number;
  processing_time_ms: number;
  cache_hit: boolean;
}

interface MessageData {
  id: number;
  content: string;
  created_at: Date;
  role: string;
  emotion_score?: number;
}

interface TopicFrequency {
  topic: string;
  frequency: number;
  keywords: string[];
  examples: string[];
}

// セキュリティ用のサニタイゼーション
function sanitizeInput(input: string): string {
  // SQLインジェクション対策
  return input
    .replace(/[<>]/g, '') // HTMLタグ除去
    .replace(/['";]/g, '') // SQL危険文字除去
    .substring(0, 500); // 長さ制限
}

// キャッシュキーの生成（SHA256）
function generateCacheKey(params: CauseAnalysisParams): string {
  const data = JSON.stringify({
    question: params.question.toLowerCase(),
    timeframe: params.timeframe || 30
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

// キャッシュからの取得
async function getFromCache(cacheKey: string): Promise<CauseAnalysisResult | null> {
  try {
    const query = `
      SELECT result, created_at 
      FROM analysis_cache 
      WHERE query_hash = $1 
        AND expires_at > CURRENT_TIMESTAMP
        AND NOT is_sensitive
      LIMIT 1
    `;
    
    const result = await pool.query(query, [cacheKey]);
    
    if (result.rows.length > 0) {
      // アクセスカウントを更新
      await pool.query(
        'UPDATE analysis_cache SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE query_hash = $1',
        [cacheKey]
      );
      
      return {
        ...result.rows[0].result,
        cache_hit: true
      };
    }
    
    return null;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
}

// キャッシュへの保存
async function saveToCache(
  cacheKey: string, 
  params: CauseAnalysisParams, 
  result: CauseAnalysisResult,
  ttlHours: number = 24
): Promise<void> {
  try {
    const query = `
      INSERT INTO analysis_cache (
        query_hash, query_type, query_params, result, 
        confidence_score, data_points, expires_at, is_sensitive
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (query_hash) DO UPDATE 
      SET result = $4, 
          confidence_score = $5,
          data_points = $6,
          expires_at = $7,
          access_count = analysis_cache.access_count + 1,
          last_accessed = CURRENT_TIMESTAMP
    `;
    
    const isSensitive = params.securityLevel === 'high';
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    
    await pool.query(query, [
      cacheKey,
      'cause_analysis',
      JSON.stringify(params),
      JSON.stringify(result),
      result.confidence_score,
      result.data_points,
      expiresAt,
      isSensitive
    ]);
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

// メッセージ取得（セキュアな実装）
async function getMessages(timeframeDays: number, period: 'recent' | 'baseline'): Promise<MessageData[]> {
  const endDate = period === 'recent' 
    ? 'CURRENT_TIMESTAMP' 
    : `CURRENT_TIMESTAMP - INTERVAL '${timeframeDays} days'`;
  
  const startDate = period === 'recent'
    ? `CURRENT_TIMESTAMP - INTERVAL '${timeframeDays} days'`
    : `CURRENT_TIMESTAMP - INTERVAL '${timeframeDays * 2} days'`;
  
  const query = `
    SELECT 
      id,
      content,
      created_at,
      role,
      emotion_score
    FROM conversation_messages
    WHERE created_at >= ${startDate}
      AND created_at < ${endDate}
      AND role = 'user'
    ORDER BY created_at DESC
    LIMIT 5000
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

// トピック抽出（重要キーワードの検出）
function extractTopics(messages: MessageData[]): Map<string, TopicFrequency> {
  const topicMap = new Map<string, TopicFrequency>();
  
  // 分析対象のキーワードカテゴリ
  const keywordCategories = {
    work_stress: ['夜勤', '残業', 'トラブル', '上司', '会社', '仕事', '職場', 'ミス', '失敗'],
    health: ['疲れ', '眠い', '頭痛', '体調', '風邪', '病院', '薬', '睡眠', '不眠'],
    emotion: ['不安', 'イライラ', 'ストレス', '憂鬱', '悲しい', '寂しい', '楽しい', '嬉しい'],
    life: ['引っ越し', '家', '部屋', '生活', '買い物', '料理', '掃除', '洗濯'],
    tech: ['プログラミング', 'コード', '開発', 'バグ', 'エラー', 'システム', 'アプリ', 'データベース'],
    learning: ['勉強', '学習', '資格', '本', '動画', 'Udemy', 'YouTube', '練習'],
    relationships: ['友達', '家族', '恋人', '同僚', '親', '会話', '連絡', 'LINE']
  };
  
  for (const message of messages) {
    const content = message.content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(keywordCategories)) {
      let categoryCount = 0;
      const foundKeywords: string[] = [];
      const examples: string[] = [];
      
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          categoryCount++;
          foundKeywords.push(keyword);
          
          // 文脈を保存（最初の3例まで）
          if (examples.length < 3) {
            const sentenceMatch = content.match(new RegExp(`[^。]*${keyword}[^。]*`, 'i'));
            if (sentenceMatch) {
              examples.push(sentenceMatch[0].substring(0, 100));
            }
          }
        }
      }
      
      if (categoryCount > 0) {
        const existing = topicMap.get(category) || { 
          topic: category, 
          frequency: 0, 
          keywords: [], 
          examples: [] 
        };
        
        existing.frequency += categoryCount;
        existing.keywords = [...new Set([...existing.keywords, ...foundKeywords])];
        existing.examples = [...new Set([...existing.examples, ...examples])].slice(0, 5);
        
        topicMap.set(category, existing);
      }
    }
  }
  
  return topicMap;
}

// 変化検出
function detectChanges(
  recentTopics: Map<string, TopicFrequency>, 
  baselineTopics: Map<string, TopicFrequency>
): Array<{topic: string; changeRatio: number; details: TopicFrequency}> {
  const changes: Array<{topic: string; changeRatio: number; details: TopicFrequency}> = [];
  
  for (const [topic, recentData] of recentTopics.entries()) {
    const baselineData = baselineTopics.get(topic);
    const baselineFreq = baselineData?.frequency || 1;
    const changeRatio = (recentData.frequency - baselineFreq) / baselineFreq;
    
    // 30%以上の変化を検出
    if (Math.abs(changeRatio) > 0.3) {
      changes.push({
        topic,
        changeRatio,
        details: recentData
      });
    }
  }
  
  return changes.sort((a, b) => Math.abs(b.changeRatio) - Math.abs(a.changeRatio));
}

// 原因のランク付け
function rankCauses(changes: Array<{topic: string; changeRatio: number; details: TopicFrequency}>): ProbableCause[] {
  const causes: ProbableCause[] = [];
  
  const causeDescriptions: Record<string, string> = {
    work_stress: '仕事・職場環境のストレス増加',
    health: '健康状態・体調の変化',
    emotion: '感情・メンタル状態の変動',
    life: '生活環境・日常習慣の変化',
    tech: '技術的な課題・開発作業の変化',
    learning: '学習活動・スキル習得の変化',
    relationships: '人間関係・コミュニケーションの変化'
  };
  
  for (const change of changes.slice(0, 5)) {
    const confidence = Math.min(0.95, Math.abs(change.changeRatio));
    
    causes.push({
      cause: causeDescriptions[change.topic] || change.topic,
      confidence,
      evidence: change.details.examples.slice(0, 3),
      timeline: change.details.examples.map(() => 
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      ),
      keywords: change.details.keywords
    });
  }
  
  return causes;
}

// 推奨事項の生成
function generateRecommendations(causes: ProbableCause[]): string[] {
  const recommendations: string[] = [];
  
  if (causes.length === 0) {
    return ['過去のデータを継続的に記録することで、より正確な分析が可能になります'];
  }
  
  const topCause = causes[0];
  
  // カテゴリ別の推奨事項
  const recommendationMap: Record<string, string[]> = {
    '仕事・職場環境のストレス増加': [
      '夜勤や残業のパターンを記録し、体調への影響を可視化することをお勧めします',
      'ストレス要因を特定し、上司や同僚と改善策を相談することを検討してください',
      '転職活動の準備として、スキルの棚卸しとポートフォリオ作成を始めましょう'
    ],
    '健康状態・体調の変化': [
      '睡眠時間と質を改善するため、就寝前のルーティンを見直しましょう',
      '定期的な運動習慣を取り入れることで、体調改善が期待できます',
      '必要に応じて医療機関での健康診断を受けることをお勧めします'
    ],
    '感情・メンタル状態の変動': [
      'ストレス解消法（瞑想、深呼吸、趣味活動）を日常に取り入れましょう',
      '感情日記を継続することで、パターンの把握と対策が可能になります',
      'メンタルヘルスの専門家への相談も選択肢として検討してください'
    ],
    '生活環境・日常習慣の変化': [
      '生活リズムを整えるため、起床・就寝時間を固定化しましょう',
      '環境改善（部屋の整理、照明調整など）で快適性を向上させましょう',
      '新しい習慣を少しずつ取り入れ、持続可能な改善を目指しましょう'
    ]
  };
  
  const category = topCause.cause;
  if (recommendationMap[category]) {
    recommendations.push(...recommendationMap[category]);
  } else {
    recommendations.push(
      '継続的なデータ記録により、パターンの把握が可能になります',
      '小さな改善から始めて、徐々に大きな変化を目指しましょう',
      '必要に応じて専門家のアドバイスを求めることも重要です'
    );
  }
  
  return recommendations.slice(0, 3);
}

// ログ記録
async function logAnalysis(
  params: CauseAnalysisParams,
  result: CauseAnalysisResult,
  error?: string
): Promise<void> {
  try {
    const query = `
      INSERT INTO cause_analysis_logs (
        question, timeframe_days, analysis_type, 
        probable_causes, evidence_count, confidence_level,
        recommendations, processing_time_ms, error_log
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    await pool.query(query, [
      params.question,
      params.timeframe || 30,
      'general',
      JSON.stringify(result.probable_causes),
      result.data_points,
      result.confidence_score,
      result.recommendations,
      result.processing_time_ms,
      error
    ]);
  } catch (err) {
    console.error('Failed to log analysis:', err);
  }
}

// メインツール定義
export const analyzeCauseTool = {
  name: 'analyze_cause',
  description: '過去のデータから変化の原因を分析し、推定原因と改善提案を生成します',
  inputSchema: {
    type: 'object',
    properties: {
      question: { 
        type: 'string',
        description: '分析したい質問（例：なぜ最近疲れやすいの？）'
      },
      timeframe: { 
        type: 'number',
        description: '分析期間（日数）',
        default: 30,
        minimum: 7,
        maximum: 365
      },
      useCache: {
        type: 'boolean',
        description: 'キャッシュを使用するか',
        default: true
      },
      securityLevel: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'セキュリティレベル',
        default: 'medium'
      }
    },
    required: ['question']
  },
  handler: async (params: CauseAnalysisParams): Promise<CauseAnalysisResult> => {
    const startTime = Date.now();
    
    try {
      // 入力のサニタイゼーション
      const sanitizedQuestion = sanitizeInput(params.question);
      const timeframe = Math.min(365, Math.max(7, params.timeframe || 30));
      
      // キャッシュチェック
      if (params.useCache !== false) {
        const cacheKey = generateCacheKey({ ...params, question: sanitizedQuestion });
        const cached = await getFromCache(cacheKey);
        if (cached) {
          console.log('Cache hit for cause analysis');
          return cached;
        }
      }
      
      // メッセージ取得
      const [recentMessages, baselineMessages] = await Promise.all([
        getMessages(timeframe, 'recent'),
        getMessages(timeframe, 'baseline')
      ]);
      
      // データ不足チェック
      if (recentMessages.length < 10) {
        const result: CauseAnalysisResult = {
          question: sanitizedQuestion,
          analysis_period: {
            start_date: new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            days: timeframe
          },
          data_points: recentMessages.length,
          probable_causes: [],
          recommendations: ['より多くのデータが必要です。日々の記録を継続してください。'],
          confidence_score: 0.2,
          processing_time_ms: Date.now() - startTime,
          cache_hit: false
        };
        
        await logAnalysis(params, result);
        return result;
      }
      
      // トピック分析
      const recentTopics = extractTopics(recentMessages);
      const baselineTopics = extractTopics(baselineMessages);
      
      // 変化検出
      const changes = detectChanges(recentTopics, baselineTopics);
      
      // 原因ランク付け
      const causes = rankCauses(changes);
      
      // 推奨事項生成
      const recommendations = generateRecommendations(causes);
      
      // 信頼度計算
      const confidenceScore = Math.min(0.95, 
        (recentMessages.length / 100) * 0.3 + 
        (causes.length > 0 ? 0.5 : 0) +
        (baselineMessages.length / 100) * 0.2
      );
      
      const result: CauseAnalysisResult = {
        question: sanitizedQuestion,
        analysis_period: {
          start_date: new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          days: timeframe
        },
        data_points: recentMessages.length + baselineMessages.length,
        probable_causes: causes.slice(0, 3),
        recommendations,
        confidence_score: confidenceScore,
        processing_time_ms: Date.now() - startTime,
        cache_hit: false
      };
      
      // キャッシュ保存
      if (params.useCache !== false && params.securityLevel !== 'high') {
        const cacheKey = generateCacheKey({ ...params, question: sanitizedQuestion });
        await saveToCache(cacheKey, params, result);
      }
      
      // ログ記録
      await logAnalysis(params, result);
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Cause analysis error:', errorMessage);
      
      const errorResult: CauseAnalysisResult = {
        question: params.question,
        analysis_period: {
          start_date: new Date(Date.now() - (params.timeframe || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          days: params.timeframe || 30
        },
        data_points: 0,
        probable_causes: [],
        recommendations: ['分析中にエラーが発生しました。しばらく待ってから再試行してください。'],
        confidence_score: 0,
        processing_time_ms: Date.now() - startTime,
        cache_hit: false
      };
      
      await logAnalysis(params, errorResult, errorMessage);
      throw new Error(`原因分析に失敗しました: ${errorMessage}`);
    }
  }
};