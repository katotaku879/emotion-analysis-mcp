import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from '../database.js';

interface SleepAnalysisParams {
  timeframe?: number;
}

export const analyzeSleepPatternsTool: Tool = {
  name: 'analyze_sleep_patterns',
  description: 'Analyze sleep patterns and quality',
  inputSchema: {
    type: 'object',
    properties: {
      timeframe: { type: 'number', default: 30 }
    }
  },
  handler: async (params: SleepAnalysisParams) => {
    const { timeframe = 30 } = params;
    
    try {
      // 深夜の活動を分析
      const lateNightActivity = await pool.query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as late_messages,
           MIN(EXTRACT(HOUR FROM created_at)) as earliest_hour,
           MAX(EXTRACT(HOUR FROM created_at)) as latest_hour
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
         AND (EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5 
              OR EXTRACT(HOUR FROM created_at) >= 23)
         GROUP BY date
         ORDER BY date DESC`
      );
      
      // 睡眠関連キーワード
      const sleepKeywords = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE content LIKE '%眠れない%') as insomnia_count,
           COUNT(*) FILTER (WHERE content LIKE '%寝れない%') as cant_sleep_count,
           COUNT(*) FILTER (WHERE content LIKE '%睡眠%') as sleep_mention_count,
           COUNT(*) FILTER (WHERE content LIKE '%夜勤%') as night_shift_count,
           COUNT(*) FILTER (WHERE content LIKE '%眠い%' OR content LIKE '%眠たい%') as sleepy_count
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'`
      );
      
      // 平均的な活動時間帯
      const activityHours = await pool.query(
        `SELECT 
           AVG(CASE WHEN EXTRACT(HOUR FROM created_at) < 6 
                    THEN EXTRACT(HOUR FROM created_at) + 24 
                    ELSE EXTRACT(HOUR FROM created_at) END) as avg_active_hour
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
         AND EXTRACT(HOUR FROM created_at) IN (22,23,0,1,2,3,4,5)`
      );
      
      // 分析結果の計算
      const avgLateNight = lateNightActivity.rows.reduce((sum, row) => sum + row.late_messages, 0) / lateNightActivity.rows.length || 0;
      const sleepIssues = sleepKeywords.rows[0];
      const totalSleepProblems = sleepIssues.insomnia_count + sleepIssues.cant_sleep_count;
      const avgActiveHour = activityHours.rows[0]?.avg_active_hour || 0;
      
      // 睡眠スコアの計算（0-100）
      let sleepScore = 100;
      sleepScore -= avgLateNight * 5; // 深夜メッセージごとに-5
      sleepScore -= totalSleepProblems * 3; // 睡眠問題の言及ごとに-3
      sleepScore -= sleepIssues.night_shift_count * 2; // 夜勤ごとに-2
      sleepScore = Math.max(0, Math.min(100, sleepScore));
      
      // 推定睡眠時間
      const estimatedSleepHours = avgActiveHour > 24 ? 
        Math.max(3, 7 - (avgActiveHour - 24)) : 
        Math.max(3, 8 - avgLateNight);
      
      return {
        summary: `睡眠スコア: ${sleepScore}/100。推定平均睡眠時間は約${estimatedSleepHours.toFixed(1)}時間です。${totalSleepProblems > 10 ? '深刻な睡眠障害の可能性があります。' : totalSleepProblems > 5 ? '軽度の睡眠問題が見られます。' : ''}`,
        findings: [
          `不眠の訴え：${totalSleepProblems}回（「眠れない」${sleepIssues.insomnia_count}回、「寝れない」${sleepIssues.cant_sleep_count}回）`,
          `深夜活動：平均${avgLateNight.toFixed(1)}件/日の深夜投稿`,
          `夜勤の影響：${sleepIssues.night_shift_count}回の夜勤言及${sleepIssues.night_shift_count > 5 ? '（体内時計への影響大）' : ''}`,
          `日中の眠気：${sleepIssues.sleepy_count}回の言及`
        ],
        recommendations: [
          sleepScore < 30 ? '医療機関での睡眠相談を強く推奨します' : 
          sleepScore < 50 ? '睡眠習慣の改善が必要です' : 
          sleepScore < 70 ? '睡眠の質を向上させる工夫をしましょう' : 
          '現在の睡眠パターンを維持してください',
          avgActiveHour > 1 ? '就寝時刻を早めることを検討してください' : '',
          totalSleepProblems > 5 ? 'メラトニンサプリメントや睡眠導入剤の検討を' : '',
          sleepIssues.night_shift_count > 3 ? '夜勤後の睡眠リズム回復法を実践してください' : ''
        ].filter(Boolean),
        metadata: {
          sleepScore: sleepScore,
          estimatedSleepHours: estimatedSleepHours,
          dataPoints: lateNightActivity.rows.length,
          confidence: 0.80
        }
      };
    } catch (error) {
      console.error('Sleep analysis error:', error);
      throw error;
    }
  }
};
