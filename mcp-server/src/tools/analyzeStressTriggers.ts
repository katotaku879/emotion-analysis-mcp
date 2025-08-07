// ~/emotion-analysis-mcp/mcp-server/src/tools/analyzeStressTriggers.ts

import { Pool } from 'pg';

// ストレスキーワードと影響度スコア
const STRESS_KEYWORDS = {
  // 職場環境
  "夜勤": -8.5,
  "残業": -7.0,
  "トラブル": -7.2,
  "ピリピリ": -6.8,
  "プレッシャー": -7.5,
  "締切": -6.0,
  "会議": -5.5,
  "上司": -6.5,
  "クレーム": -8.0,
  
  // 感情表現
  "疲れた": -6.5,
  "疲れ": -6.0,
  "辞めたい": -9.0,
  "限界": -9.5,
  "ストレス": -7.0,
  "不安": -6.5,
  "イライラ": -7.5,
  "辛い": -8.0,
  "きつい": -7.0,
  "しんどい": -7.5,
  
  // 身体症状
  "眠れない": -8.0,
  "頭痛": -7.5,
  "胃痛": -8.0,
  "めまい": -8.5,
  "吐き気": -9.0,
  
  // 仕事への態度
  "やる気が出ない": -7.5,
  "行きたくない": -8.5,
  "休みたい": -6.0,
  "逃げたい": -9.0,
  "もう無理": -9.5
};

interface StressTrigger {
  keyword: string;
  frequency: number;
  impact_score: number;
  recent_occurrences: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export async function analyzeStressTriggers(pool: Pool): Promise<{
  top_triggers: StressTrigger[];
  overall_stress_level: number;
  critical_keywords: string[];
  recommendations: string[];
  trend_analysis: {
    this_week: number;
    last_week: number;
    change_rate: number;
  };
}> {
  try {
    // 1. 過去30日間のメッセージからストレスキーワードを検索
    const keywordsList = Object.keys(STRESS_KEYWORDS);
    const placeholders = keywordsList.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      WITH keyword_occurrences AS (
        SELECT 
          keyword,
          message_id,
          created_at,
          content
        FROM (
          SELECT 
            cm.id as message_id,
            cm.created_at,
            cm.content,
            unnest(ARRAY[${placeholders}]) as keyword
          FROM conversation_messages cm
          WHERE cm.created_at > NOW() - INTERVAL '30 days'
            AND cm.role = 'user'
        ) t
        WHERE position(lower(keyword) in lower(content)) > 0
      ),
      keyword_stats AS (
        SELECT 
          keyword,
          COUNT(*) as frequency,
          array_agg(DISTINCT LEFT(content, 100) ORDER BY created_at DESC LIMIT 3) as recent_examples,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as this_week_count,
          COUNT(CASE WHEN created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN 1 END) as last_week_count
        FROM keyword_occurrences
        GROUP BY keyword
      )
      SELECT 
        keyword,
        frequency,
        recent_examples,
        this_week_count,
        last_week_count,
        CASE 
          WHEN this_week_count > last_week_count * 1.5 THEN 'increasing'
          WHEN this_week_count < last_week_count * 0.7 THEN 'decreasing'
          ELSE 'stable'
        END as trend
      FROM keyword_stats
      ORDER BY frequency DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query, keywordsList);
    
    // 2. 各トリガーの詳細情報を構築
    const topTriggers: StressTrigger[] = result.rows.map(row => {
      const impactScore = STRESS_KEYWORDS[row.keyword as keyof typeof STRESS_KEYWORDS] || -5.0;
      const severity = getSeverity(row.frequency, impactScore);
      
      return {
        keyword: row.keyword,
        frequency: parseInt(row.frequency),
        impact_score: impactScore,
        recent_occurrences: row.recent_examples || [],
        trend: row.trend as 'increasing' | 'stable' | 'decreasing',
        severity
      };
    });
    
    // 3. 全体的なストレスレベルを計算
    const overallStressLevel = calculateOverallStress(topTriggers);
    
    // 4. クリティカルなキーワードを特定
    const criticalKeywords = topTriggers
      .filter(t => t.severity === 'critical' || (t.frequency > 5 && t.impact_score < -8))
      .map(t => t.keyword);
    
    // 5. トレンド分析
    const thisWeekTotal = result.rows.reduce((sum, r) => sum + parseInt(r.this_week_count), 0);
    const lastWeekTotal = result.rows.reduce((sum, r) => sum + parseInt(r.last_week_count), 0);
    const changeRate = lastWeekTotal > 0 
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 
      : 0;
    
    // 6. 推奨アクション生成
    const recommendations = generateRecommendations(topTriggers, overallStressLevel, changeRate);
    
    return {
      top_triggers: topTriggers.slice(0, 5),  // TOP5のみ返す
      overall_stress_level: overallStressLevel,
      critical_keywords: criticalKeywords,
      recommendations,
      trend_analysis: {
        this_week: thisWeekTotal,
        last_week: lastWeekTotal,
        change_rate: Math.round(changeRate)
      }
    };
    
  } catch (error) {
    console.error('Error analyzing stress triggers:', error);
    throw error;
  }
}

// 重要度の判定
function getSeverity(frequency: number, impactScore: number): 'critical' | 'high' | 'medium' | 'low' {
  const severityScore = frequency * Math.abs(impactScore);
  
  if (severityScore > 80) return 'critical';
  if (severityScore > 50) return 'high';
  if (severityScore > 25) return 'medium';
  return 'low';
}

// 全体的なストレスレベル計算（0-100）
function calculateOverallStress(triggers: StressTrigger[]): number {
  if (triggers.length === 0) return 0;
  
  const totalImpact = triggers.reduce((sum, t) => {
    return sum + (t.frequency * Math.abs(t.impact_score));
  }, 0);
  
  // 正規化（最大値を100とする）
  const maxPossibleImpact = 500;  // 調整可能
  const stressLevel = Math.min(100, (totalImpact / maxPossibleImpact) * 100);
  
  return Math.round(stressLevel);
}

// 推奨アクション生成
function generateRecommendations(
  triggers: StressTrigger[], 
  stressLevel: number,
  changeRate: number
): string[] {
  const recommendations: string[] = [];
  
  // ストレスレベルに基づく基本推奨
  if (stressLevel > 70) {
    recommendations.push("🚨 緊急: 今すぐ転職活動を開始することを強く推奨");
    recommendations.push("💊 健康チェック: 医療機関での健康診断を検討");
  } else if (stressLevel > 50) {
    recommendations.push("⚠️ 警告: 転職の準備を本格的に始める時期");
    recommendations.push("🧘 ストレス管理: 定期的な休息とリラックス時間の確保");
  } else if (stressLevel > 30) {
    recommendations.push("📊 観察: ストレス要因を継続的にモニタリング");
    recommendations.push("📝 準備: 職務経歴書の作成を開始");
  }
  
  // トレンドに基づく推奨
  if (changeRate > 30) {
    recommendations.push("📈 急増中: ストレスが急激に増加しています。早急な対策が必要");
  } else if (changeRate < -20) {
    recommendations.push("📉 改善中: ストレスが減少傾向。この調子を維持");
  }
  
  // 特定のキーワードに基づく推奨
  const hasNightShift = triggers.some(t => t.keyword === "夜勤");
  const hasPhysicalSymptoms = triggers.some(t => 
    ["眠れない", "頭痛", "胃痛", "めまい", "吐き気"].includes(t.keyword)
  );
  const hasExtremeWords = triggers.some(t => 
    ["限界", "もう無理", "辞めたい", "逃げたい"].includes(t.keyword)
  );
  
  if (hasNightShift) {
    recommendations.push("🌙 夜勤対策: 日勤のみの職場を優先的に検討");
  }
  
  if (hasPhysicalSymptoms) {
    recommendations.push("🏥 健康優先: 身体症状が出ています。休職も視野に入れて");
  }
  
  if (hasExtremeWords) {
    recommendations.push("🆘 メンタルケア: 信頼できる人に相談、カウンセリングの検討");
  }
  
  // 具体的なアクションアイテム
  if (stressLevel > 40) {
    recommendations.push("📋 今週のTODO: 転職サイト3社に登録、エージェント面談予約");
    recommendations.push("💼 ポートフォリオ: MCPシステムをGitHubで公開");
  }
  
  return recommendations.slice(0, 5);  // 最大5つの推奨事項
}

// エクスポート用のインターフェース
export interface StressTriggerAnalysis {
  analyze: typeof analyzeStressTriggers;
}