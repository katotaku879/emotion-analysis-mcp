import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from './db-config.js';

interface SelfAnalysisParams {
  include_all_time?: boolean;
  format?: 'detailed' | 'summary';
}

interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface SelfAnalysisResult {
  personality_traits: PersonalityTraits;
  core_values: Array<{
    value: string;
    importance: number;
    evidence_count: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

export const self_profile: Tool = {
  name: 'generate_self_profile',
  description: 'Generate comprehensive self-analysis profile based on conversation history',
  inputSchema: {
    type: 'object',
    properties: {
      include_all_time: { 
        type: 'boolean',
        description: 'Include all historical data (default: true)',
        default: true
      },
      format: { 
        type: 'string',
        enum: ['detailed', 'summary'],
        description: 'Output format',
        default: 'detailed'
      }
    }
  },
  
  async handler(params: SelfAnalysisParams): Promise<SelfAnalysisResult> {
    const { include_all_time = true, format = 'detailed' } = params;
    
    try {
      console.log('🧠 自己分析プロファイル生成開始...');
      
      // キャッシュチェック
      const cacheQuery = `
        SELECT result 
        FROM analysis_cache 
        WHERE query_type = 'self_analysis' 
        AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const cacheResult = await pool.query(cacheQuery);
      
      if (cacheResult.rows.length > 0) {
        console.log('📦 キャッシュから結果を取得');
        return cacheResult.rows[0].result;
      }
      
      // 全メッセージ取得
      const timeCondition = include_all_time ? '' : "WHERE created_at >= NOW() - INTERVAL '90 days'";
      const messagesQuery = `
        SELECT content, created_at 
        FROM conversation_messages 
        ${timeCondition}
        ORDER BY created_at DESC
      `;
      const messagesResult = await pool.query(messagesQuery);
      const messages = messagesResult.rows;
      
      console.log(`📊 ${messages.length}件のメッセージを分析`);
      
      // BigFive分析
      const personality = analyzeBigFive(messages);
      
      // 価値観抽出
      const values = extractCoreValues(messages);
      
      // 強み・弱み分析
      const { strengths, weaknesses } = analyzeStrengthsWeaknesses(personality, messages);
      
      // サマリー生成
      const summary = generatePersonalitySummary(personality, values, strengths, weaknesses);
      
      const result: SelfAnalysisResult = {
        personality_traits: personality,
        core_values: values,
        strengths,
        weaknesses,
        summary
      };
      
      // キャッシュ保存
      const cacheInsert = `
        INSERT INTO analysis_cache (query_type, query_params, result, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
      `;
      await pool.query(cacheInsert, ['self_analysis', params, result]);
      
      return result;
      
    } catch (error) {
      console.error('❌ 自己分析エラー:', error);
      throw error;
    }
  }
};

function analyzeBigFive(messages: any[]): PersonalityTraits {
  const indicators = {
    openness: ['新しい', '挑戦', '学習', '創造', '興味', '発見', '探求', '試', 'アイデア'],
    conscientiousness: ['計画', '完璧', '責任', '整理', '継続', '目標', '達成', '完了', '管理'],
    extraversion: ['人', '話', '楽しい', '一緒', '会', 'パーティー', '交流', '友達', '同僚'],
    agreeableness: ['助け', '協力', '思いやり', '共感', '優しい', '配慮', '理解', '支援', 'サポート'],
    neuroticism: ['不安', '心配', 'ストレス', '怖い', '緊張', '悩み', '焦り', 'イライラ', '落ち込']
  };
  
  const scores: any = {};
  const totalMessages = messages.length;
  
  for (const [trait, keywords] of Object.entries(indicators)) {
    let messageWithKeyword = 0;
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      const hasKeyword = keywords.some(keyword => content.includes(keyword));
      if (hasKeyword) messageWithKeyword++;
    });
    
    // 実際の出現率
    const occurrenceRate = (messageWithKeyword / totalMessages) * 100;
    
    // 平方根スケール×15で計算
    scores[trait] = Math.min(100, Math.round(Math.sqrt(occurrenceRate) * 15));
  }
  
  return scores as PersonalityTraits;
}

function extractCoreValues(messages: any[]): any[] {
  const valueKeywords = {
    '成長': ['成長', '学習', '向上', '改善', 'スキル'],
    '安定': ['安定', '安心', '確実', '保証', '継続'],
    '自由': ['自由', '柔軟', 'リモート', '選択', '独立'],
    '人間関係': ['友達', '家族', '恋人', '仲間', '同僚'],
    '達成': ['達成', '成功', '完成', '目標', '実現'],
    '健康': ['健康', '体調', '睡眠', '運動', '休息'],
    '創造': ['創造', '作成', '開発', '新しい', 'アイデア']
  };
  
  const valueCounts = new Map<string, number>();
  
  messages.forEach(msg => {
    const content = msg.content.toLowerCase();
    for (const [value, keywords] of Object.entries(valueKeywords)) {
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
        }
      });
    }
  });
  
  const sortedValues = Array.from(valueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({
      value,
      importance: Math.min(1, count / messages.length * 10),
      evidence_count: count
    }));
  
  return sortedValues;
}

function analyzeStrengthsWeaknesses(personality: PersonalityTraits, messages: any[]): any {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  if (personality.openness > 70) {
    strengths.push('新しいことへの適応力が高い');
    strengths.push('創造的な問題解決能力');
  }
  
  if (personality.conscientiousness > 70) {
    strengths.push('計画性と実行力');
    strengths.push('責任感が強い');
  }
  
  if (personality.extraversion < 30) {
    weaknesses.push('大人数での交流が苦手');
    strengths.push('深い思考と集中力');
  }
  
  if (personality.neuroticism > 70) {
    weaknesses.push('ストレスを感じやすい');
    weaknesses.push('不安になりやすい傾向');
  }
  
  const stressCount = messages.filter(m => 
    m.content.includes('ストレス') || m.content.includes('疲れ')
  ).length;
  
  if (stressCount > messages.length * 0.1) {
    weaknesses.push('ストレス管理の改善が必要');
  }
  
  return { strengths, weaknesses };
}

function generatePersonalitySummary(
  personality: PersonalityTraits,
  values: any[],
  strengths: string[],
  weaknesses: string[]
): string {
  const dominantTrait = Object.entries(personality)
    .sort((a, b) => b[1] - a[1])[0];
  
  const traitDescriptions: any = {
    openness: '新しい経験や学習に対して開放的',
    conscientiousness: '計画的で責任感が強い',
    extraversion: '社交的でエネルギッシュ',
    agreeableness: '協調性が高く思いやりがある',
    neuroticism: '感受性が豊かで繊細'
  };
  
  const topValues = values.slice(0, 2).map(v => v.value).join('と');
  
  return `あなたは${traitDescriptions[dominantTrait[0]]}な性格で、` +
         `特に${topValues}を重視する傾向があります。` +
         `主な強みは${strengths[0] || '分析中'}で、` +
         `${weaknesses.length > 0 ? `改善の余地がある点は${weaknesses[0]}です。` : ''}` +
         `全体的に、自己理解が深く、成長志向の強い人物像が浮かび上がります。`;
}

export default self_profile;
