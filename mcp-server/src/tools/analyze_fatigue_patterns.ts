import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from '../database.js';

interface FatigueAnalysisParams {
  timeframe?: number;
}

export const analyzeFatiguePatternsTool: Tool = {
  name: 'analyze_fatigue_patterns',
  description: 'Analyze physical and mental fatigue patterns',
  inputSchema: {
    type: 'object',
    properties: {
      timeframe: { type: 'number', default: 30 }
    }
  },
  handler: async (params: FatigueAnalysisParams) => {
    const { timeframe = 30 } = params;
    
    try {
      // 疲労関連キーワードの分析
      const fatigueKeywords = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE content LIKE '%疲れ%') as tired_count,
           COUNT(*) FILTER (WHERE content LIKE '%だるい%') as sluggish_count,
           COUNT(*) FILTER (WHERE content LIKE '%しんどい%') as exhausted_count,
           COUNT(*) FILTER (WHERE content LIKE '%眠い%' OR content LIKE '%眠たい%') as sleepy_count,
           COUNT(*) FILTER (WHERE content LIKE '%やる気%ない%' OR content LIKE '%無気力%') as unmotivated_count,
           COUNT(*) FILTER (WHERE content LIKE '%頭痛%' OR content LIKE '%頭が痛%') as headache_count
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'`
      );
      
      // 曜日別の疲労パターン
      const weeklyPattern = await pool.query(
        `SELECT 
           EXTRACT(DOW FROM created_at) as day_of_week,
           COUNT(*) FILTER (WHERE content LIKE ANY(ARRAY['%疲れ%', '%だるい%', '%しんどい%'])) as fatigue_mentions,
           0 as avg_emotion
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
         GROUP BY day_of_week
         ORDER BY fatigue_mentions DESC`
      );
      
      // 時間帯別の疲労度
      const hourlyFatigue = await pool.query(
        `SELECT 
           EXTRACT(HOUR FROM created_at) as hour,
           COUNT(*) FILTER (WHERE content LIKE ANY(ARRAY['%疲れ%', '%だるい%', '%しんどい%'])) as count
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
         GROUP BY hour
         ORDER BY count DESC
         LIMIT 3`
      );
      
      // 活動との相関
      // emotion_logsは使わず、conversation_messagesから活動パターンを分析
      const activityCorrelation = await pool.query(`
        SELECT 
          CASE 
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 9 AND 17 THEN 'work'
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 22 AND 5 THEN 'night_shift'
            ELSE 'other'
          END as activity,
          COUNT(*) as occurrence,
          COUNT(*) FILTER (WHERE content LIKE ANY(ARRAY['%疲れ%', '%だるい%', '%しんどい%'])) as fatigue_count
        FROM conversation_messages
        WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
        GROUP BY activity
        ORDER BY fatigue_count DESC
        LIMIT 5
      `);
      
      // 分析結果の計算
      const fatigue = fatigueKeywords.rows[0];
      const totalFatigue = fatigue.tired_count + fatigue.sluggish_count + fatigue.exhausted_count;
      const physicalFatigue = fatigue.tired_count + fatigue.sluggish_count + fatigue.headache_count;
      const mentalFatigue = fatigue.unmotivated_count + fatigue.sleepy_count;
      
      // 疲労タイプの判定
      const fatigueType = physicalFatigue > mentalFatigue * 1.5 ? '身体的疲労優位' :
                          mentalFatigue > physicalFatigue * 1.5 ? '精神的疲労優位' :
                          '複合型疲労';
      
      // 疲労度スコア（0-100）
      const fatigueScore = Math.min(100, 
        (totalFatigue * 2) + 
        (fatigue.unmotivated_count * 3) + 
        (fatigue.headache_count * 2)
      );
      
      // 最も疲労が高い曜日
      const worstDay = weeklyPattern.rows[0];
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const worstDayName = dayNames[worstDay?.day_of_week || 0];
      
      // 最も疲労を訴える時間帯
      const peakHours = hourlyFatigue.rows.map(row => `${row.hour}時`).join('、');
      
      return {
        summary: `疲労度スコア: ${fatigueScore}/100（${fatigueType}）。過去${timeframe}日間で疲労関連の言及が${totalFatigue}回検出されました。${fatigueScore > 70 ? '慢性的な疲労状態です。' : fatigueScore > 40 ? '中程度の疲労が蓄積しています。' : '疲労は管理可能なレベルです。'}`,
        findings: [
          `疲労の内訳：身体的${Math.round((physicalFatigue / (totalFatigue || 1)) * 100)}%、精神的${Math.round((mentalFatigue / (totalFatigue || 1)) * 100)}%`,
          `症状の頻度：「疲れた」${fatigue.tired_count}回、「だるい」${fatigue.sluggish_count}回、「しんどい」${fatigue.exhausted_count}回`,
          `週間パターン：${worstDayName}曜日に最も疲労（${worstDay?.fatigue_mentions || 0}回）`,
          `ピーク時間帯：${peakHours}に疲労の訴えが集中`,
          `関連症状：頭痛${fatigue.headache_count}回、無気力${fatigue.unmotivated_count}回`
        ],
        recommendations: [
          fatigueScore > 70 ? '医療機関での健康診断を推奨します' :
          fatigueScore > 50 ? '休息時間を増やし、生活リズムを整えましょう' :
          '現在の疲労管理を継続してください',
          fatigueType === '身体的疲労優位' ? '軽い運動やストレッチを取り入れましょう' :
          fatigueType === '精神的疲労優位' ? 'メンタルケアとストレス解消を重視してください' :
          'バランスの良い休息と活動を心がけてください',
          fatigue.headache_count > 5 ? '頭痛が頻繁です。原因の特定と対策が必要です' : '',
          worstDayName === '月' || worstDayName === '金' ? '週の始めと終わりの負担を軽減する工夫を' : ''
        ].filter(Boolean),
        metadata: {
          fatigueScore: fatigueScore,
          fatigueType: fatigueType,
          dataPoints: totalFatigue,
          confidence: 0.85
        }
      };
    } catch (error) {
      console.error('Fatigue analysis error:', error);
      throw error;
    }
  }
};
