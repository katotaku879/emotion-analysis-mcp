import { pool } from './config.js';
import { EmotionRecord, EmotionAnalysis, ActivityAnalysis } from '../types/mcp.js';

export class EmotionQueries {
  
  // 基本的な感情統計取得
  async getEmotionSummary(days: number = 30): Promise<EmotionAnalysis> {
    const client = await pool.connect();
    
    try {
      // 指定日数内の感情分布を取得
      const emotionDistQuery = `
        SELECT 
          et.name as emotion,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM emotion_logs 
            WHERE date >= CURRENT_DATE - INTERVAL '${days} days'), 2) as percentage
        FROM emotion_logs el
        JOIN emotion_types et ON el.emotion_type_id = et.id
        WHERE el.date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY et.name, et.id
        ORDER BY count DESC;
      `;
      
      // 平均強度取得
      const avgIntensityQuery = `
        SELECT 
          COUNT(*) as total_records,
          ROUND(AVG(intensity), 2) as average_intensity
        FROM emotion_logs 
        WHERE date >= CURRENT_DATE - INTERVAL '${days} days';
      `;
      
      // 最頻出感情取得
      const predominantQuery = `
        SELECT et.name as predominant_emotion
        FROM emotion_logs el
        JOIN emotion_types et ON el.emotion_type_id = et.id
        WHERE el.date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY et.name, et.id
        ORDER BY COUNT(*) DESC
        LIMIT 1;
      `;
      
      const [emotionDist, avgData, predominant] = await Promise.all([
        client.query(emotionDistQuery),
        client.query(avgIntensityQuery),
        client.query(predominantQuery)
      ]);
      
      return {
        period: `Last ${days} days`,
        totalRecords: parseInt(avgData.rows[0]?.total_records || '0'),
        emotionDistribution: emotionDist.rows.map(row => ({
          emotion: row.emotion,
          count: parseInt(row.count),
          percentage: parseFloat(row.percentage)
        })),
        averageIntensity: parseFloat(avgData.rows[0]?.average_intensity || '0'),
        predominantEmotion: predominant.rows[0]?.predominant_emotion || 'No data'
      };
      
    } finally {
      client.release();
    }
  }
  
  // 活動別感情分析
  async getActivityAnalysis(activityName: string): Promise<ActivityAnalysis> {
    const client = await pool.connect();
    
    try {
      // 正規化された活動と自由記述活動の両方をチェック
      const query = `
        SELECT 
          el.intensity,
          et.name as emotion,
          COUNT(*) as count
        FROM emotion_logs el
        JOIN emotion_types et ON el.emotion_type_id = et.id
        LEFT JOIN activities a ON el.activity_id = a.id
        WHERE (a.name = $1 OR el.activity_custom = $1)
        GROUP BY el.intensity, et.name
        ORDER BY count DESC;
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total_occurrences
        FROM emotion_logs el
        LEFT JOIN activities a ON el.activity_id = a.id
        WHERE (a.name = $1 OR el.activity_custom = $1);
      `;
      
      const avgQuery = `
        SELECT ROUND(AVG(intensity), 2) as avg_intensity
        FROM emotion_logs el
        LEFT JOIN activities a ON el.activity_id = a.id
        WHERE (a.name = $1 OR el.activity_custom = $1);
      `;
      
      const [results, countResult, avgResult] = await Promise.all([
        client.query(query, [activityName]),
        client.query(countQuery, [activityName]),
        client.query(avgQuery, [activityName])
      ]);
      
      return {
        activityName,
        totalOccurrences: parseInt(countResult.rows[0]?.total_occurrences || '0'),
        emotionImpact: {
          averageIntensity: parseFloat(avgResult.rows[0]?.avg_intensity || '0'),
          emotionDistribution: results.rows.map(row => ({
            emotion: row.emotion,
            count: parseInt(row.count)
          }))
        },
        recommendations: this.generateRecommendations(
          activityName, 
          parseFloat(avgResult.rows[0]?.avg_intensity || '0')
        )
      };
      
    } finally {
      client.release();
    }
  }
  
  // 幸福トリガー発見
  async getHappinessTriggers(minIntensity: number = 8): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          COALESCE(a.name, el.activity_custom) as activity,
          COUNT(*) as occurrences,
          ROUND(AVG(intensity), 2) as avg_intensity,
          MAX(intensity) as max_intensity
        FROM emotion_logs el
        LEFT JOIN activities a ON el.activity_id = a.id
        JOIN emotion_types et ON el.emotion_type_id = et.id
        WHERE el.intensity >= $1 AND et.type = 'positive'
        GROUP BY COALESCE(a.name, el.activity_custom)
        HAVING COUNT(*) >= 2
        ORDER BY avg_intensity DESC, occurrences DESC
        LIMIT 10;
      `;
      
      const result = await client.query(query, [minIntensity]);
      return result.rows;
      
    } finally {
      client.release();
    }
  }
  
  private generateRecommendations(activity: string, avgIntensity: number): string[] {
    const recommendations: string[] = [];
    
    if (avgIntensity >= 8) {
      recommendations.push(`✨ "${activity}" consistently brings you joy! Consider doing this more often.`);
      recommendations.push(`📅 Try scheduling "${activity}" during stressful periods.`);
    } else if (avgIntensity >= 6) {
      recommendations.push(`👍 "${activity}" has a positive impact on your mood.`);
      recommendations.push(`🔄 Look for ways to enhance your experience with "${activity}".`);
    } else if (avgIntensity < 6) {
      recommendations.push(`⚠️ "${activity}" might be associated with lower mood. Consider if this is necessary.`);
      recommendations.push(`🎯 If you must continue "${activity}", try pairing it with something you enjoy.`);
    }
    
    return recommendations;
  }
}

export const emotionQueries = new EmotionQueries();
