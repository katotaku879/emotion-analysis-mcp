import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from './db-config.js';

interface EmotionPattern {
  pattern_name: string;
  frequency: number;
  triggers: string[];
  time_pattern: string;
  confidence: number;
}

export const emotion_patterns: Tool = {
  name: 'detect_emotion_patterns',
  description: 'Detect emotional patterns from conversation history',
  inputSchema: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly'],
        default: 'monthly'
      },
      min_frequency: {
        type: 'number',
        default: 3
      }
    }
  },
  
  async handler(params: any): Promise<EmotionPattern[]> {
    const { period = 'monthly', min_frequency = 3 } = params;
    
    console.log(`🎭 感情パターン分析開始 (${period})`);
    
    try {
      const interval = period === 'daily' ? '1 day' : period === 'weekly' ? '7 days' : '30 days';
      
      const query = `
        SELECT 
          DATE_PART('hour', created_at) as hour,
          DATE_PART('dow', created_at) as day_of_week,
          COUNT(*) as message_count,
          AVG(CASE 
            WHEN content LIKE '%疲れ%' OR content LIKE '%だるい%' THEN -1
            WHEN content LIKE '%嬉しい%' OR content LIKE '%楽しい%' THEN 1
            ELSE 0
          END) as sentiment_score
        FROM conversation_messages
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND sender = 'user'
        GROUP BY hour, day_of_week
        HAVING COUNT(*) >= $1
        ORDER BY message_count DESC
        LIMIT 10
      `;
      
      const result = await pool.query(query, [min_frequency]);
      
      const patterns: EmotionPattern[] = result.rows.map(row => ({
        pattern_name: `${getDayName(row.day_of_week)}の${row.hour}時`,
        frequency: parseInt(row.message_count),
        triggers: identifyTriggers(row),
        time_pattern: `毎週${getDayName(row.day_of_week)}`,
        confidence: calculateConfidence(parseInt(row.message_count))
      }));
      
      console.log(`✅ ${patterns.length}個のパターンを検出`);
      return patterns;
      
    } catch (error) {
      console.error('❌ 感情パターン分析エラー:', error);
      throw error;
    }
  }
};

function getDayName(dow: number): string {
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  return days[dow] || `Day${dow}`;
}

function identifyTriggers(row: any): string[] {
  const triggers = [];
  if (row.sentiment_score < -0.5) {
    triggers.push('ネガティブな感情');
  }
  if (row.hour >= 22 || row.hour <= 5) {
    triggers.push('深夜の活動');
  }
  if (row.day_of_week === 1) {
    triggers.push('週の始まり');
  }
  return triggers;
}

function calculateConfidence(frequency: number): number {
  return Math.min(0.95, 0.5 + (frequency / 100));
}

export default emotion_patterns;
