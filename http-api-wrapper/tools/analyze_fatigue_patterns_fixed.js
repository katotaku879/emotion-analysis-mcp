"use strict";
// ~/emotion-analysis-mcp/mcp-server/src/tools/analyze_fatigue_patterns.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFatiguePatternsTool = void 0;
const database_js_1 = require("../database.js");
exports.analyzeFatiguePatternsTool = {
    name: 'analyze_fatigue_patterns',
    description: 'Analyze physical and mental fatigue patterns',
    inputSchema: {
        type: 'object',
        properties: {
            timeframe: { type: 'number', default: 30 }
        }
    },
    handler: async (params) => {
        const { timeframe = 30 } = params;
        try {
            // 疲労関連キーワードの分析（roleカラムが存在しないため削除）
            const fatigueKeywords = await database_js_1.pool.query(`SELECT 
           COUNT(*) FILTER (WHERE content ILIKE '%疲れ%')::INTEGER as tired_count,
           COUNT(*) FILTER (WHERE content ILIKE '%だるい%')::INTEGER as sluggish_count,
           COUNT(*) FILTER (WHERE content ILIKE '%しんどい%')::INTEGER as exhausted_count,
           COUNT(*) FILTER (WHERE content ILIKE '%眠い%' OR content ILIKE '%眠たい%')::INTEGER as sleepy_count,
           COUNT(*) FILTER (WHERE content ILIKE '%やる気%ない%' OR content ILIKE '%無気力%')::INTEGER as unmotivated_count,
           COUNT(*) FILTER (WHERE content ILIKE '%頭痛%' OR content ILIKE '%頭が痛%')::INTEGER as headache_count,
           COUNT(*)::INTEGER as total_messages
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '30 days'`);
            // 曜日別の疲労パターン
            const weeklyPattern = await database_js_1.pool.query(`SELECT 
           EXTRACT(DOW FROM created_at)::INTEGER as day_of_week,
           COUNT(*) FILTER (WHERE content ILIKE ANY(ARRAY['%疲れ%', '%だるい%', '%しんどい%']))::INTEGER as fatigue_mentions,
           COUNT(*)::INTEGER as total_messages_day
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY fatigue_mentions DESC`);
            // 時間帯別の疲労度
            const hourlyFatigue = await database_js_1.pool.query(`SELECT 
           EXTRACT(HOUR FROM created_at)::INTEGER as hour,
           COUNT(*) FILTER (WHERE content ILIKE ANY(ARRAY['%疲れ%', '%だるい%', '%しんどい%']))::INTEGER as count
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY count DESC
         LIMIT 3`);
            // 活動との相関
            const activityCorrelation = await database_js_1.pool.query(`
        SELECT 
          CASE 
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 9 AND 17 THEN 'work'
            WHEN EXTRACT(HOUR FROM created_at) BETWEEN 22 AND 5 THEN 'night_shift'
            ELSE 'other'
          END as activity,
          COUNT(*)::INTEGER as occurrence,
          COUNT(*) FILTER (WHERE content ILIKE ANY(ARRAY['%疲れ%', '%だるい%', '%しんどい%']))::INTEGER as fatigue_count
        FROM conversation_messages
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY fatigue_count DESC
        LIMIT 5
      `);
            // 分析結果の計算
            const fatigue = fatigueKeywords.rows[0];
            // 数値型への明示的な変換とnullチェック
            const tiredCount = parseInt(fatigue?.tired_count || 0);
            const sluggishCount = parseInt(fatigue?.sluggish_count || 0);
            const exhaustedCount = parseInt(fatigue?.exhausted_count || 0);
            const sleepyCount = parseInt(fatigue?.sleepy_count || 0);
            const unmotivatedCount = parseInt(fatigue?.unmotivated_count || 0);
            const headacheCount = parseInt(fatigue?.headache_count || 0);
            const totalMessages = parseInt(fatigue?.total_messages || 1);
            // 重複を除いたユニークな疲労メッセージ数を取得
            const uniqueFatigueQuery = await database_js_1.pool.query(`SELECT COUNT(DISTINCT message_id)::INTEGER as unique_fatigue_messages
         FROM conversation_messages
         WHERE created_at >= NOW() - INTERVAL '30 days'
           AND content ILIKE ANY(ARRAY['%疲れ%', '%だるい%', '%しんどい%', '%眠い%', '%眠たい%', 
                                       '%やる気%ない%', '%無気力%', '%頭痛%', '%頭が痛%'])`);
            const uniqueFatigueMessages = parseInt(uniqueFatigueQuery.rows[0]?.unique_fatigue_messages || 0);
            // 物理的疲労と精神的疲労の計算
            const physicalSymptoms = tiredCount + sluggishCount + exhaustedCount + headacheCount + sleepyCount;
            const mentalSymptoms = unmotivatedCount + exhaustedCount;
            // パーセンテージ計算
            const totalSymptoms = physicalSymptoms + mentalSymptoms;
            const physicalPercentage = totalSymptoms > 0
                ? Math.round((physicalSymptoms / totalSymptoms) * 100)
                : 0;
            const mentalPercentage = totalSymptoms > 0
                ? Math.round((mentalSymptoms / totalSymptoms) * 100)
                : 0;
            // 疲労タイプの判定
            const fatigueType = physicalPercentage > 70 ? '身体的疲労優位' :
                mentalPercentage > 70 ? '精神的疲労優位' :
                    uniqueFatigueMessages > 0 ? '複合型疲労' : '疲労なし';
            // 疲労度スコア（0-100）の計算
            let fatigueScore = 0;
            if (totalMessages > 0) {
                // 1. 頻度スコア（40点満点）
                const frequencyRatio = uniqueFatigueMessages / totalMessages;
                fatigueScore += Math.min(40, frequencyRatio * 60);
                // 2. 絶対数スコア（30点満点）
                const dailyAverage = uniqueFatigueMessages / timeframe;
                fatigueScore += Math.min(30, dailyAverage * 10);
                // 3. 症状の多様性スコア（15点満点）
                const symptomTypes = [
                    tiredCount > 0, sluggishCount > 0, exhaustedCount > 0,
                    sleepyCount > 0, unmotivatedCount > 0, headacheCount > 0
                ].filter(Boolean).length;
                fatigueScore += (symptomTypes / 6) * 15;
                // 4. 重症症状スコア（15点満点）
                if (exhaustedCount > 0 || unmotivatedCount > 0 || headacheCount > 0) {
                    fatigueScore += Math.min(15, ((exhaustedCount + unmotivatedCount + headacheCount) / 10) * 15);
                }
            }
            fatigueScore = Math.round(Math.min(100, Math.max(0, fatigueScore)));
            // 最も疲労が高い曜日
            const worstDay = weeklyPattern.rows[0];
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            const worstDayName = worstDay ? dayNames[worstDay.day_of_week] : '不明';
            // 最も疲労を訴える時間帯
            const peakHours = hourlyFatigue.rows
                .filter(row => row.count > 0)
                .map(row => `${row.hour}時`)
                .join('、') || 'なし';
            // 夜勤の検出
            const nightShiftData = activityCorrelation.rows.find(r => r.activity === 'night_shift');
            const hasNightShift = nightShiftData && nightShiftData.fatigue_count > 0;
            return {
                summary: `【疲労分析】疲労度スコア: ${fatigueScore}/100（${fatigueType}）。過去${timeframe}日間で疲労関連の言及が${uniqueFatigueMessages}回検出されました。${fatigueScore > 70 ? '慢性的な疲労状態です。' :
                    fatigueScore > 40 ? '中程度の疲労が蓄積しています。' :
                        fatigueScore > 20 ? '軽度の疲労があります。' :
                            '疲労は管理可能なレベルです。'}`,
                findings: [
                    `疲労の内訳：身体的${physicalPercentage}%、精神的${mentalPercentage}%`,
                    `症状の頻度：「疲れた」${tiredCount}回、「だるい」${sluggishCount}回、「しんどい」${exhaustedCount}回`,
                    worstDay && worstDay.fatigue_mentions > 0
                        ? `週間パターン：${worstDayName}曜日に最も疲労（${worstDay.fatigue_mentions}回）`
                        : '週間パターン：特定の曜日への偏りなし',
                    peakHours !== 'なし'
                        ? `ピーク時間帯：${peakHours}に疲労の訴えが集中`
                        : 'ピーク時間帯：特定の時間帯への偏りなし',
                    `関連症状：頭痛${headacheCount}回、無気力${unmotivatedCount}回、眠気${sleepyCount}回`
                ],
                recommendations: [
                    fatigueScore > 70 ? '🚨 医療機関での健康診断を強く推奨します' :
                        fatigueScore > 50 ? '⚠️ 休息時間を増やし、生活リズムを整えましょう' :
                            fatigueScore > 30 ? '📊 疲労の蓄積に注意し、適度な休息を心がけてください' :
                                '✅ 現在の疲労管理を継続してください',
                    fatigueType === '身体的疲労優位' ? '🏃 軽い運動やストレッチ、マッサージを取り入れましょう' :
                        fatigueType === '精神的疲労優位' ? '🧘 メンタルケアとストレス解消を重視してください' :
                            fatigueType === '複合型疲労' ? '💊 心身両面のケアが必要です。バランスの良い休息を' : '',
                    headacheCount > 5 ? '🤕 頭痛が頻繁です。原因の特定と対策が必要です' : '',
                    unmotivatedCount > 3 ? '😔 無気力感が続いています。メンタルヘルスのケアを検討してください' : '',
                    hasNightShift ? '🌙 夜勤による疲労が検出されています。睡眠リズムの改善を' : '',
                    (worstDayName === '月' || worstDayName === '金') && worstDay?.fatigue_mentions > 3
                        ? '📅 週の始めと終わりの負担を軽減する工夫を' : ''
                ].filter(Boolean),
                metadata: {
                    fatigueScore: fatigueScore,
                    fatigueType: fatigueType,
                    uniqueFatigueMessages: uniqueFatigueMessages,
                    totalMessages: totalMessages,
                    physicalPercentage: physicalPercentage,
                    mentalPercentage: mentalPercentage,
                    dataPoints: uniqueFatigueMessages,
                    confidence: totalMessages > 10 ? 0.85 : 0.65
                }
            };
        }
        catch (error) {
            console.error('Fatigue analysis error:', error);
            return {
                summary: '【エラー】疲労分析中にエラーが発生しました。',
                findings: ['データの取得に失敗しました'],
                recommendations: ['システム管理者に連絡してください'],
                metadata: {
                    fatigueScore: 0,
                    fatigueType: 'unknown',
                    dataPoints: 0,
                    confidence: 0
                }
            };
        }
    }
};
//# sourceMappingURL=analyze_fatigue_patterns.js.map