import { Pool } from 'pg';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'emotion_analysis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD  // 環境変数から取得
});

// 職場ストレス分析
export async function analyze_work_stress() {
    try {
        const stressKeywords = ['夜勤', 'トラブル', 'ピリピリ', '疲れ', '辛い', '限界', 'ストレス', '辞めたい'];

        const result = await pool.query(`
            SELECT
                COUNT(*) as total_messages,
                COUNT(*) FILTER (WHERE
                    content ILIKE '%夜勤%' OR
                    content ILIKE '%トラブル%' OR
                    content ILIKE '%疲れ%' OR
                    content ILIKE '%ストレス%'
                ) as stress_messages
            FROM conversation_messages
            WHERE created_at > NOW() - INTERVAL '30 days'
        `);

        const data = result.rows[0];
        const stressPercentage = data.total_messages > 0
            ? Math.round((data.stress_messages / data.total_messages) * 100)
            : 0;

        let level = 'low';
        if (stressPercentage > 20) level = 'critical';
        else if (stressPercentage > 15) level = 'high';
        else if (stressPercentage > 10) level = 'medium';

        return {
            content: [{
                type: 'text',
                text: `📊 職場ストレス分析結果\n\nストレスキーワード出現率: ${stressPercentage}%\nストレスレベル: ${level.toUpperCase()}\n\n${level === 'critical' || level === 'high' ? '⚠️ 早急な転職活動を推奨します' : '現在は管理可能なレベルです'}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `❌ エラー: ${error.message}`
            }]
        };
    }
}

// 転職緊急度計算
export async function calculate_job_change_urgency() {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE content ILIKE '%夜勤%') as night_shift,
                COUNT(*) FILTER (WHERE content ILIKE '%辞めたい%' OR content ILIKE '%転職%') as quit_mentions,
                COUNT(*) FILTER (WHERE content ILIKE '%疲れ%') as fatigue
            FROM conversation_messages
            WHERE created_at > NOW() - INTERVAL '7 days'
        `);

        const data = result.rows[0];
        let urgencyScore = 30;

        if (data.night_shift > 5 || data.quit_mentions > 3) urgencyScore = 90;
        else if (data.night_shift > 3 || data.quit_mentions > 1) urgencyScore = 70;
        else if (data.fatigue > 5) urgencyScore = 50;

        return {
            content: [{
                type: 'text',
                text: `🎯 転職緊急度: ${urgencyScore}/100\n\n直近7日間:\n夜勤言及: ${data.night_shift}回\n転職言及: ${data.quit_mentions}回\n疲労: ${data.fatigue}回\n\n${urgencyScore >= 70 ? '🔴 今すぐ行動が必要' : urgencyScore >= 50 ? '🟡 準備を開始' : '🟢 計画的に進めましょう'}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `❌ エラー: ${error.message}`
            }]
        };
    }
}

// キャリアアドバイス生成
export async function generate_career_advice() {
    return {
        content: [{
            type: 'text',
            text: `💼 キャリアアドバイス\n\nあなたの強み:\n• MCPシステム構築実績\n• TypeScript/Node.jsスキル\n• 問題解決能力\n\n推奨キャリアパス:\n1. フルリモートエンジニア（推奨度90%）\n2. スタートアップエンジニア（推奨度70%）\n\n今すぐできること:\n• GitHubにMCPシステムをpush\n• 職務経歴書の作成\n• リモートワーク求人の検索`
        }]
    };
}
