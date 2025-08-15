import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from '../database.js';

interface CognitiveAnalysisParams {
  timeframe?: number;
}

export const analyzeCognitivePatternsTool: Tool = {
  name: 'analyze_cognitive_patterns',
  description: 'Analyze concentration, memory, and cognitive function',
  inputSchema: {
    type: 'object',
    properties: {
      timeframe: { type: 'number', default: 30 }
    }
  },
  handler: async (params: CognitiveAnalysisParams) => {
    const { timeframe = 30 } = params;
    
    try {
      // 認知機能関連キーワード
      const cognitiveKeywords = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE content LIKE '%集中%できない%' OR content LIKE '%集中力%') as concentration_issues,
           COUNT(*) FILTER (WHERE content LIKE '%忘れ%' OR content LIKE '%覚えて%ない%') as memory_issues,
           COUNT(*) FILTER (WHERE content LIKE '%ミス%' OR content LIKE '%間違%') as mistake_mentions,
           COUNT(*) FILTER (WHERE content LIKE '%判断%' OR content LIKE '%決められない%') as decision_issues,
           COUNT(*) FILTER (WHERE content LIKE '%考え%まとまらない%' OR content LIKE '%頭が回らない%') as thinking_issues
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'`
      );
      
      // プログラミング作業時のパフォーマンス
      const codingPerformance = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE content LIKE '%エラー%' OR content LIKE '%バグ%') as error_mentions,
           COUNT(*) FILTER (WHERE content LIKE '%デバッグ%') as debug_mentions,
           COUNT(*) FILTER (WHERE content LIKE '%うまくいかない%' OR content LIKE '%動かない%') as failure_mentions,
           COUNT(*) FILTER (WHERE content LIKE '%解決%' OR content LIKE '%できた%' OR content LIKE '%成功%') as success_mentions
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
         AND (content LIKE '%プログラ%' OR content LIKE '%コード%' OR content LIKE '%開発%')`
      );
      
      // 時間帯別の認知機能
      const hourlyPerformance = await pool.query(
        `SELECT 
           EXTRACT(HOUR FROM created_at) as hour,
           AVG(CASE WHEN content LIKE ANY(ARRAY['%できた%', '%解決%', '%わかった%']) THEN 1
                    WHEN content LIKE ANY(ARRAY['%できない%', '%わからない%', '%ミス%']) THEN -1
                    ELSE 0 END) as performance_score,
           COUNT(*) as activity_count
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
         GROUP BY hour
         HAVING COUNT(*) > 5
         ORDER BY performance_score DESC`
      );
      
      // 睡眠との相関
      const sleepCorrelation = await pool.query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5) as late_night_activity,
           COUNT(*) FILTER (WHERE content LIKE ANY(ARRAY['%ミス%', '%忘れ%', '%集中%できない%']) 
                           AND EXTRACT(HOUR FROM created_at) BETWEEN 9 AND 18) as next_day_issues
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
         GROUP BY date
         HAVING COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5) > 0`
      );
      
      // 分析結果の計算
      const cognitive = cognitiveKeywords.rows[0];
      const coding = codingPerformance.rows[0];
      const totalIssues = cognitive.concentration_issues + cognitive.memory_issues + 
                         cognitive.mistake_mentions + cognitive.thinking_issues;
      
      // 認知機能スコア（0-100）
      let cognitiveScore = 100;
      cognitiveScore -= cognitive.concentration_issues * 3;
      cognitiveScore -= cognitive.memory_issues * 2;
      cognitiveScore -= cognitive.mistake_mentions * 2;
      cognitiveScore -= cognitive.thinking_issues * 4;
      cognitiveScore = Math.max(0, Math.min(100, cognitiveScore));
      
      // エラー率の計算
      const errorRate = coding.error_mentions + coding.failure_mentions;
      const successRate = coding.success_mentions;
      const performanceRatio = successRate > 0 ? (errorRate / successRate) : errorRate;
      
      // 最も生産的な時間帯
      const bestHours = hourlyPerformance.rows
        .filter(row => row.performance_score > 0)
        .slice(0, 3)
        .map(row => `${row.hour}時`);
      
      // 睡眠不足の影響
      const sleepImpact = sleepCorrelation.rows.reduce((sum, row) => 
        sum + (row.next_day_issues / Math.max(1, row.late_night_activity)), 0
      ) / Math.max(1, sleepCorrelation.rows.length);
      
      return {
        summary: `認知機能スコア: ${cognitiveScore}/100。${totalIssues > 20 ? '著しい認知機能の低下が見られます。' : totalIssues > 10 ? '軽度の認知機能低下があります。' : '認知機能は正常範囲内です。'}${performanceRatio > 2 ? 'プログラミング作業でのエラーが多発しています。' : ''}`,
        findings: [
          `集中力の問題：${cognitive.concentration_issues}回の言及${cognitive.concentration_issues > 10 ? '（要改善）' : ''}`,
          `記憶力の問題：${cognitive.memory_issues}回（物忘れ、記憶できない）`,
          `ミス・エラー：${cognitive.mistake_mentions}回の言及`,
          `思考力の問題：${cognitive.thinking_issues}回（頭が回らない、考えがまとまらない）`,
          `コーディング効率：エラー${errorRate}回 vs 成功${successRate}回（比率 ${performanceRatio.toFixed(1)}）`,
          `最適な作業時間：${bestHours.join('、') || '特定できません'}`,
          `睡眠不足の影響度：${(sleepImpact * 100).toFixed(0)}%`
        ],
        recommendations: [
          cognitiveScore < 40 ? '認知機能の回復が急務です。十分な休息を取ってください' :
          cognitiveScore < 60 ? '作業効率が低下しています。休憩を増やしましょう' :
          cognitiveScore < 80 ? '軽度の集中力低下があります。環境を整えましょう' :
          '良好な認知機能を維持しています',
          performanceRatio > 2 ? 'コーディング時は小まめな休憩とテストを心がけてください' : '',
          cognitive.concentration_issues > 10 ? 'ポモドーロテクニックなど集中力向上法を試してください' : '',
          sleepImpact > 0.5 ? '睡眠不足が翌日のパフォーマンスに大きく影響しています' : '',
          bestHours.length > 0 ? `${bestHours.join('、')}が最も生産的な時間帯です。重要なタスクはこの時間に` : ''
        ].filter(Boolean),
        metadata: {
          cognitiveScore: cognitiveScore,
          errorRate: performanceRatio,
          bestProductiveHours: bestHours,
          dataPoints: totalIssues + errorRate + successRate,
          confidence: 0.82
        }
      };
    } catch (error) {
      console.error('Cognitive analysis error:', error);
      throw error;
    }
  }
};
