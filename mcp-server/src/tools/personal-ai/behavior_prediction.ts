import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from './db-config.js';

interface BehaviorPrediction {
  behavior_type: string;
  likelihood: number;
  time_frame: string;
  contributing_factors: string[];
  confidence: number;
  recommendations: string[];
}

export const behavior_prediction: Tool = {
  name: 'predict_behavior',
  description: 'Predict future behavior patterns based on historical data',
  inputSchema: {
    type: 'object',
    properties: {
      context: {
        type: 'string',
        description: 'Context for prediction'
      },
      horizon_days: {
        type: 'number',
        default: 7
      }
    }
  },
  
  async handler(params: any): Promise<BehaviorPrediction[]> {
    const { context = 'general', horizon_days = 7 } = params;
    
    console.log(`🔮 行動予測分析開始 (${horizon_days}日間)`);
    
    try {
      const patternQuery = `
        WITH stress_indicators AS (
          SELECT 
            COUNT(CASE WHEN content LIKE '%ストレス%' OR content LIKE '%疲れ%' THEN 1 END) as stress_count,
            COUNT(CASE WHEN content LIKE '%夜勤%' THEN 1 END) as night_shift_count,
            COUNT(*) as total_messages
          FROM conversation_messages
          WHERE sender = 'user'
          AND created_at >= NOW() - INTERVAL '90 days'
        )
        SELECT * FROM stress_indicators
      `;
      
      const patternResult = await pool.query(patternQuery);
      const patterns = patternResult.rows[0];
      
      const trendQuery = `
        SELECT 
          COUNT(CASE WHEN content LIKE '%ストレス%' THEN 1 END) as recent_stress,
          COUNT(CASE WHEN content LIKE '%転職%' THEN 1 END) as job_change_mentions,
          COUNT(*) as total_recent
        FROM conversation_messages
        WHERE sender = 'user'
        AND created_at >= NOW() - INTERVAL '7 days'
      `;
      
      const trendResult = await pool.query(trendQuery);
      const trends = trendResult.rows[0];
      
      const predictions: BehaviorPrediction[] = [];
      
      // ストレス関連の予測
      const avgStress = patterns.stress_count / Math.max(patterns.total_messages, 1) * 100;
      const recentStress = trends.recent_stress / Math.max(trends.total_recent, 1) * 100;
      
      if (recentStress > avgStress * 1.5) {
        predictions.push({
          behavior_type: 'ストレス増加',
          likelihood: 0.75,
          time_frame: `今後${horizon_days}日間`,
          contributing_factors: [
            '最近のストレス言及が平均の1.5倍',
            '夜勤の継続',
            '疲労の蓄積'
          ],
          confidence: 0.7,
          recommendations: [
            '休息時間を意識的に確保する',
            'ストレス解消法を実践する',
            '睡眠の質を改善する'
          ]
        });
      }
      
      // 転職活動の予測
      if (trends.job_change_mentions > 0) {
        predictions.push({
          behavior_type: '転職活動の本格化',
          likelihood: 0.65,
          time_frame: `今後${horizon_days * 2}日間`,
          contributing_factors: [
            '転職への言及あり',
            '職場ストレスの継続',
            'キャリア変更への関心'
          ],
          confidence: 0.6,
          recommendations: [
            '職務経歴書の準備',
            'スキルの棚卸し',
            'ネットワーキングの強化'
          ]
        });
      }
      
      console.log(`✅ ${predictions.length}個の行動予測を生成`);
      return predictions;
      
    } catch (error) {
      console.error('❌ 行動予測エラー:', error);
      throw error;
    }
  }
};

export default behavior_prediction;
