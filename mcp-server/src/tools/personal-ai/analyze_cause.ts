import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from './db-config.js';

interface CauseAnalysisParams {
  question: string;
  timeframe?: number;
}

interface Change {
  topic: string;
  changeRatio: number;
  recentFrequency: number;
  baselineFrequency: number;
}

interface CauseAnalysisResult {
  probable_causes: Array<{
    cause: string;
    confidence: number;
    evidence: string[];
    timeline: string[];
  }>;
  recommendations: string[];
  summary: string;
  dataPoints: number;
}

export const analyze_cause: Tool = {
  name: 'analyze_recent_changes',
  description: 'Analyze recent changes and find probable causes for user questions',
  inputSchema: {
    type: 'object',
    properties: {
      question: { 
        type: 'string',
        description: 'The question to analyze'
      },
      timeframe: { 
        type: 'number',
        description: 'Number of days to analyze (default: 30)',
        default: 30
      }
    },
    required: ['question']
  },
  
  async handler(params: CauseAnalysisParams): Promise<CauseAnalysisResult> {
    const { question, timeframe = 30 } = params;
    
    try {
      console.log(`🔍 原因分析開始: "${question}" (過去${timeframe}日間)`);
      
      const recentQuery = `
        SELECT content, created_at 
        FROM conversation_messages 
        WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
        AND sender = 'user'
        ORDER BY created_at DESC
      `;
      const recentResult = await pool.query(recentQuery);
      const recentMessages = recentResult.rows;
      
      const baselineQuery = `
        SELECT content, created_at 
        FROM conversation_messages 
        WHERE created_at >= NOW() - INTERVAL '${timeframe * 2} days'
        AND created_at < NOW() - INTERVAL '${timeframe} days'
        AND sender = 'user'
        ORDER BY created_at DESC
      `;
      const baselineResult = await pool.query(baselineQuery);
      const baselineMessages = baselineResult.rows;
      
      console.log(`📊 データ取得: 最近${recentMessages.length}件, ベースライン${baselineMessages.length}件`);
      
      const changes = detectChanges(recentMessages, baselineMessages);
      const correlations = analyzeCorrelations(changes, question);
      const causes = rankByCausality(correlations, recentMessages);
      const recommendations = generateRecommendations(causes);
      const summary = generateSummary(causes, recentMessages.length);
      
      return {
        probable_causes: causes.slice(0, 3),
        recommendations,
        summary,
        dataPoints: recentMessages.length
      };
      
    } catch (error) {
      console.error('❌ 原因分析エラー:', error);
      throw error;
    }
  }
};

function detectChanges(recent: any[], baseline: any[]): Change[] {
  const stressKeywords = [
    '疲れ', '眠い', 'だるい', 'しんどい', 'つらい',
    '夜勤', 'トラブル', 'ストレス', '不安', '心配',
    '残業', '忙しい', 'ピリピリ', '緊張', 'イライラ'
  ];
  
  const recentFreq = new Map<string, number>();
  const baselineFreq = new Map<string, number>();
  
  recent.forEach(msg => {
    const content = msg.content.toLowerCase();
    stressKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        recentFreq.set(keyword, (recentFreq.get(keyword) || 0) + 1);
      }
    });
  });
  
  baseline.forEach(msg => {
    const content = msg.content.toLowerCase();
    stressKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        baselineFreq.set(keyword, (baselineFreq.get(keyword) || 0) + 1);
      }
    });
  });
  
  const changes: Change[] = [];
  for (const [keyword, recentCount] of recentFreq.entries()) {
    const baselineCount = baselineFreq.get(keyword) || 0;
    const changeRatio = baselineCount === 0 
      ? recentCount 
      : (recentCount - baselineCount) / baselineCount;
    
    if (Math.abs(changeRatio) > 0.3) {
      changes.push({
        topic: keyword,
        changeRatio,
        recentFrequency: recentCount,
        baselineFrequency: baselineCount
      });
    }
  }
  
  return changes.sort((a, b) => Math.abs(b.changeRatio) - Math.abs(a.changeRatio));
}

function analyzeCorrelations(changes: Change[], question: string): any[] {
  const questionKeywords = ['疲れ', '眠い', 'だるい', '体調', '気分'];
  const relevantKeyword = questionKeywords.find(k => question.includes(k));
  
  const correlations = changes.map(change => {
    let relevanceScore = 0.5;
    
    if (relevantKeyword && change.topic.includes(relevantKeyword)) {
      relevanceScore += 0.3;
    }
    
    relevanceScore += Math.min(0.2, Math.abs(change.changeRatio) / 10);
    
    return {
      ...change,
      relevanceScore,
      confidence: Math.min(0.95, relevanceScore)
    };
  });
  
  return correlations.filter(c => c.relevanceScore > 0.6);
}

function rankByCausality(correlations: any[], messages: any[]): any[] {
  return correlations.map(correlation => {
    const evidence = messages
      .filter(msg => msg.content.toLowerCase().includes(correlation.topic))
      .slice(0, 3)
      .map(msg => msg.content.substring(0, 100));
    
    const timeline = messages
      .filter(msg => msg.content.toLowerCase().includes(correlation.topic))
      .map(msg => new Date(msg.created_at).toLocaleDateString('ja-JP'));
    
    return {
      cause: `${correlation.topic}の頻度が${correlation.changeRatio > 0 ? '増加' : '減少'}`,
      confidence: correlation.confidence,
      evidence,
      timeline: [...new Set(timeline)].slice(0, 5)
    };
  });
}

function generateRecommendations(causes: any[]): string[] {
  const recommendations: string[] = [];
  
  causes.forEach(cause => {
    if (cause.cause.includes('夜勤')) {
      recommendations.push('睡眠リズムを整えるため、休日は規則正しい生活を心がける');
      recommendations.push('夜勤前後の仮眠を効果的に活用する');
    }
    if (cause.cause.includes('ストレス')) {
      recommendations.push('定期的なリラックス時間を設ける');
      recommendations.push('ストレス源となっている要因を特定し、対処法を検討する');
    }
    if (cause.cause.includes('疲れ')) {
      recommendations.push('十分な休息時間を確保する');
      recommendations.push('栄養バランスの良い食事を心がける');
    }
  });
  
  return [...new Set(recommendations)].slice(0, 5);
}

function generateSummary(causes: any[], dataPoints: number): string {
  if (causes.length === 0) {
    return `過去30日間の${dataPoints}件のデータを分析しましたが、明確な原因は特定できませんでした。`;
  }
  
  const topCause = causes[0];
  const confidence = Math.round(topCause.confidence * 100);
  
  return `過去30日間の${dataPoints}件のデータを分析した結果、` +
         `最も可能性の高い原因は「${topCause.cause}」です（確信度${confidence}%）。`;
}

export default analyze_cause;
