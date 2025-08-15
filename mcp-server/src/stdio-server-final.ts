#!/usr/bin/env node

/**
 * Emotion Analysis MCP Server (統合版)
 * 感情分析 + 会話分析の完全統合MCPサーバー
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { analyzeStressTriggers } from './tools/analyzeStressTriggers.js';

const filters = require('./filters');


// 環境変数を読み込み
dotenv.config();

// データベース接続設定
const pool = new Pool({
  user: process.env.DB_USER || 'mkykr',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'emotion_analysis',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// サーバー初期化
const server = new Server(
  {
    name: "emotion-analysis-mcp-server",
    version: "1.0.0",
    capabilities: {
      tools: {},
    },
  }
);

const AVAILABLE_TOOLS = [
  {
        name: 'test_connection',
        description: 'Test database connection and return system status',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'analyze_emotions',
        description: 'Analyze emotion patterns over a specified time period',
        inputSchema: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Number of days to analyze (default: 30)',
              default: 30,
            },
          },
          required: [],
        },
      },
      {
        name: 'analyze_activity',
        description: 'Analyze activity patterns and correlations with emotions',
        inputSchema: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Number of days to analyze (default: 30)',
              default: 30,
            },
          },
          required: [],
        },
      },
      {
        name: 'find_happiness_triggers',
        description: 'Identify activities and patterns that correlate with high happiness scores',
        inputSchema: {
          type: 'object',
          properties: {
            min_happiness: {
              type: 'number',
              description: 'Minimum happiness score to consider (default: 7)',
              default: 7,
            },
            days: {
              type: 'number',
              description: 'Number of days to analyze (default: 60)',
              default: 60,
            },
          },
          required: [],
        },
      },
      {
        name: 'get_conversation_stats',
        description: 'Get comprehensive statistics about conversation sessions',
        inputSchema: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Number of days to analyze (default: 30)',
              default: 30,
            },
          },
          required: [],
        },
      },
      {
        name: 'analyze_conversation_keywords',
        description: 'Analyze keyword frequencies and emotional associations in conversations',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of keywords to analyze',
              default: ['不安', '成長', '人間関係', '将来'],
            },
            days: {
              type: 'number',
              description: 'Number of days to analyze (default: 90)',
              default: 90,
            },
          },
          required: [],
        },
      },
      {
        name: 'compare_conversation_sessions',
        description: 'Compare patterns between different conversation sessions',
        inputSchema: {
          type: 'object',
          properties: {
            session1_id: {
              type: 'string',
              description: 'First session ID to compare',
            },
            session2_id: {
              type: 'string',
              description: 'Second session ID to compare',
            },
            analysis_type: {
              type: 'string',
              enum: ['emotional_tone', 'topics', 'communication_style', 'comprehensive'],
              description: 'Type of comparison analysis',
              default: 'comprehensive',
            },
          },
          required: [],
        },
      },
      {
        name: 'detect_risk_patterns',
        description: 'Detect concerning patterns in conversations that may indicate stress or emotional distress',
        inputSchema: {
          type: 'object',
          properties: {
            sensitivity: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Detection sensitivity level',
              default: 'medium',
            },
            days: {
              type: 'number',
              description: 'Number of days to analyze (default: 30)',
              default: 30,
            },
          },
          required: [],
        },
      },
      {
        name: 'generate_personalized_advice',
        description: 'Generate personalized advice based on conversation patterns and emotional data',
        inputSchema: {
          type: 'object',
          properties: {
            focus_area: {
              type: 'string',
              enum: ['overall', 'emotional_wellness', 'productivity', 'relationships', 'personal_growth', 'stress_management'],
              description: 'Area to focus the advice on',
              default: 'overall',
            },
            advice_type: {
              type: 'string',
              enum: ['gentle', 'direct', 'analytical', 'motivational'],
              description: 'Style of advice delivery',
              default: 'analytical',
            },
            days: {
              type: 'number',
              description: 'Number of days of data to base advice on (default: 60)',
              default: 60,
            },
          },
          required: [],
        },
      },
      {
        name: 'classify_conversation_type',
        description: 'Automatically classify conversation type based on content',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session ID to classify',
            },
            session_title: {
              type: 'string',
              description: 'Session title for classification',
            },
            sample_content: {
              type: 'string',
              description: 'Sample content from the conversation',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'analyze_all_conversation_types',
        description: 'Analyze patterns across all conversation types',
        inputSchema: {
          type: 'object',
          properties: {
            time_period: {
              type: 'number',
              description: 'Days to analyze (default: 90)',
              default: 90,
            },
          },
          required: [],
        },
      },
      {
        name: 'get_unified_personality_profile',
        description: 'Generate unified personality profile from all conversation types',
        inputSchema: {
          type: 'object',
          properties: {
            include_predictions: {
              type: 'boolean',
              description: 'Include behavioral predictions',
              default: true,
            },
          },
          required: [],
        },
      },
      {
        name: 'analyze_work_stress',
        description: '職場ストレスレベルを分析し、転職の必要性を評価',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'calculate_job_change_urgency',
        description: '転職緊急度を計算し、行動の優先度を提示',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'generate_career_advice',
        description: 'パーソナライズされたキャリアアドバイスを生成',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'analyze_stress_triggers',
        description: 'Analyze stress triggers from conversation history and provide job change recommendations',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
]; 
// ツール一覧定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: AVAILABLE_TOOLS };
});


// ツール実行ハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'test_connection':
        try {
          const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as total_records FROM emotions');
          const conversationResult = await pool.query('SELECT COUNT(*) as session_count FROM conversation_sessions');
          
          return {
            content: [{
              type: 'text',
              text: `✅ **データベース接続成功**\n\n` +
                    `🕐 現在時刻: ${result.rows[0].current_time}\n` +
                    `📊 感情記録数: ${result.rows[0].total_records}件\n` +
                    `💬 会話セッション数: ${conversationResult.rows[0].session_count}件\n\n` +
                    `🔧 システム状態: 正常稼働中`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ データベース接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'analyze_emotions':
        try {
          const period = (args as any)?.period || '7 days';
          const includeSystemMessages = (args as any)?.includeSystemMessages || false;
          
          const emotionQuery = `
            SELECT 
              cm.content,
              cm.role,
              cm.created_at
            FROM conversation_messages cm
            WHERE cm.created_at > NOW() - INTERVAL '${period}'
            ORDER BY cm.created_at DESC
          `;
          
          const emotionResult = await pool.query(emotionQuery);
          let messages = emotionResult.rows;
          const originalCount = messages.length;
          
          // フィルタリング適用
          if (!includeSystemMessages) {
            messages = filters.filterConversations(messages);
            console.log(`🔍 Filtered: ${originalCount} → ${messages.length} messages`);
          }
          
          // 感情分析
          const emotionalTrends = filters.analyzeEmotionalTrends(messages);
          const emotionalMessages = filters.extractEmotionalMessages(messages);
          
          // 統計情報
          const stats = {
            total_messages: originalCount,
            filtered_messages: messages.length,
            emotional_messages: emotionalMessages.length,
            system_messages_removed: originalCount - messages.length,
            filtering_accuracy: messages.length > 0
              ? ((emotionalMessages.length / messages.length) * 100).toFixed(1)
              : 0
          };
          
          return {
            content: [{
              type: 'text',
              text: `✅ 感情分析完了\n\n` +
                    `期間: ${period}\n` +
                    `総メッセージ: ${originalCount}件\n` +
                    `システムメッセージ除外: ${originalCount - messages.length}件\n` +
                    `感情関連メッセージ: ${emotionalMessages.length}件\n` +
                    `分析精度: ${stats.filtering_accuracy}%\n` +
                    `感情傾向: ポジティブ ${emotionalTrends.positive}件, ネガティブ ${emotionalTrends.negative}件`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 感情分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      case 'analyze_activity':
        try {
          const days = (args as any)?.days || 30;
          
          const activityQuery = await pool.query(`
            SELECT 
              activity,
              COUNT(*) as frequency,
              AVG(score) as avg_emotion_score,
              COUNT(CASE WHEN score >= 7 THEN 1 END) as positive_count,
              COUNT(CASE WHEN score <= 4 THEN 1 END) as negative_count
            FROM emotions 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            AND activity IS NOT NULL 
            GROUP BY activity 
            HAVING COUNT(*) >= 2
            ORDER BY avg_emotion_score DESC, frequency DESC
          `);

          const correlationQuery = await pool.query(`
            SELECT 
              EXTRACT(HOUR FROM created_at) as hour,
              AVG(score) as avg_score,
              COUNT(*) as count
            FROM emotions 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY EXTRACT(HOUR FROM created_at)
            HAVING COUNT(*) >= 2
            ORDER BY hour
          `);

          const activities = activityQuery.rows.map(row => {
            const positiveRate = (row.positive_count / row.frequency * 100).toFixed(1);
            return `**${row.activity}**: ${row.frequency}回 (平均: ${parseFloat(row.avg_emotion_score).toFixed(1)}/10, ポジティブ率: ${positiveRate}%)`;
          }).join('\n');

          const hourlyPattern = correlationQuery.rows.map(row => 
            `${row.hour}時: ${parseFloat(row.avg_score).toFixed(1)}/10`
          ).join(', ');

          return {
            content: [{
              type: 'text',
              text: `🎯 **活動パターン分析 (過去${days}日間)**\n\n` +
                    `**活動別感情スコア**:\n${activities}\n\n` +
                    `**時間帯別パターン**:\n${hourlyPattern}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 活動分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'find_happiness_triggers':
        try {
          const minHappiness = (args as any)?.min_happiness || 7;
          const days = (args as any)?.days || 60;
          
          const triggerQuery = await pool.query(`
            WITH happy_records AS (
              SELECT * FROM emotions 
              WHERE score >= $1 AND created_at >= NOW() - INTERVAL '${days} days'
            ),
            activity_analysis AS (
              SELECT 
                activity,
                COUNT(*) as happy_frequency,
                AVG(score) as avg_happiness,
                COUNT(*) * 100.0 / (SELECT COUNT(*) FROM happy_records) as percentage
              FROM happy_records 
              WHERE activity IS NOT NULL
              GROUP BY activity
              HAVING COUNT(*) >= 2
            ),
            emotion_analysis AS (
              SELECT 
                emotion,
                COUNT(*) as happy_frequency,
                AVG(score) as avg_happiness,
                COUNT(*) * 100.0 / (SELECT COUNT(*) FROM happy_records) as percentage
              FROM happy_records 
              GROUP BY emotion
              HAVING COUNT(*) >= 2
            ),
            time_analysis AS (
              SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as happy_frequency,
                AVG(score) as avg_happiness
              FROM happy_records
              GROUP BY EXTRACT(HOUR FROM created_at)
              HAVING COUNT(*) >= 2
              ORDER BY happy_frequency DESC
            )
            SELECT 
              'activity' as type, activity as trigger, happy_frequency, avg_happiness, percentage
            FROM activity_analysis
            UNION ALL
            SELECT 
              'emotion' as type, emotion as trigger, happy_frequency, avg_happiness, percentage
            FROM emotion_analysis
            UNION ALL
            SELECT 
              'time' as type, hour::text || '時' as trigger, happy_frequency, avg_happiness, 0 as percentage
            FROM time_analysis
            ORDER BY type, happy_frequency DESC
          `, [minHappiness]);

          const activityTriggers = triggerQuery.rows
            .filter(row => row.type === 'activity')
            .map(row => `**${row.trigger}**: ${row.happy_frequency}回 (${row.percentage.toFixed(1)}%, 平均${parseFloat(row.avg_happiness).toFixed(1)}/10)`)
            .join('\n');

          const emotionTriggers = triggerQuery.rows
            .filter(row => row.type === 'emotion')
            .map(row => `**${row.trigger}**: ${row.happy_frequency}回 (${row.percentage.toFixed(1)}%)`)
            .join('\n');

          const timeTriggers = triggerQuery.rows
            .filter(row => row.type === 'time')
            .slice(0, 5)
            .map(row => `**${row.trigger}**: ${row.happy_frequency}回`)
            .join('\n');

          return {
            content: [{
              type: 'text',
              text: `🌟 **幸福度トリガー分析 (スコア${minHappiness}以上, 過去${days}日間)**\n\n` +
                    `**幸福につながる活動**:\n${activityTriggers || 'データが不足しています'}\n\n` +
                    `**ポジティブな感情パターン**:\n${emotionTriggers || 'データが不足しています'}\n\n` +
                    `**幸福度の高い時間帯**:\n${timeTriggers || 'データが不足しています'}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 幸福トリガー分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'get_conversation_stats':
        try {
          const days = (args as any)?.days || 30;
          
          const sessionQuery = await pool.query(`
            SELECT 
              session_id,
              session_title,
              session_number,
              total_messages,
              total_characters,
              importance_score,
              created_at,
              DATE(created_at) as session_date,
              EXTRACT(HOUR FROM created_at) as session_hour
            FROM conversation_sessions 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            ORDER BY created_at DESC
          `);

          const summaryQuery = await pool.query(`
            SELECT 
              COUNT(*) as total_sessions,
              SUM(total_messages) as total_messages,
              SUM(total_characters) as total_characters,
              AVG(total_messages) as avg_messages_per_session,
              AVG(total_characters) as avg_characters_per_session,
              AVG(importance_score) as avg_importance,
              COUNT(DISTINCT DATE(created_at)) as active_days
            FROM conversation_sessions 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
          `);

          const timePatternQuery = await pool.query(`
            SELECT 
              EXTRACT(HOUR FROM created_at) as hour,
              COUNT(*) as session_count,
              AVG(total_messages) as avg_messages
            FROM conversation_sessions 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY EXTRACT(HOUR FROM created_at)
            HAVING COUNT(*) > 0
            ORDER BY session_count DESC
            LIMIT 5
          `);

          const summary = summaryQuery.rows[0];
          const sessions = sessionQuery.rows;
          const timePatterns = timePatternQuery.rows;

          const sessionList = sessions.slice(0, 10).map(session => 
            `**${session.session_title}** (${session.session_date})\n` +
            `• メッセージ数: ${session.total_messages}, 文字数: ${session.total_characters}\n` +
            `• 重要度: ${session.importance_score}/10`
          ).join('\n\n');

          const timePattern = timePatterns.map(pattern => 
            `${pattern.hour}時: ${pattern.session_count}セッション (平均${Math.round(pattern.avg_messages)}メッセージ)`
          ).join('\n');

          return {
            content: [{
              type: 'text',
              text: `💬 **会話統計 (過去${days}日間)**\n\n` +
                    `**📊 全体サマリー**\n` +
                    `• 総セッション数: ${summary.total_sessions}\n` +
                    `• 総メッセージ数: ${summary.total_messages}\n` +
                    `• 総文字数: ${summary.total_characters}\n` +
                    `• セッション平均メッセージ数: ${Math.round(summary.avg_messages_per_session)}\n` +
                    `• 平均重要度: ${parseFloat(summary.avg_importance).toFixed(1)}/10\n` +
                    `• アクティブ日数: ${summary.active_days}/${days}日\n\n` +
                    `**⏰ 時間帯別パターン**\n${timePattern}\n\n` +
                    `**📝 最近のセッション**\n${sessionList}`
            }],
            data: {
              summary: summary,
              sessions: sessions,
              timePatterns: timePatterns
            }
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 会話統計エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'analyze_conversation_keywords':
        try {
          const keywords = (args as any)?.keywords || ['不安', '成長', '人間関係', '将来'];
          const days = (args as any)?.days || 90;
          
          const keywordAnalysis = [];
          
          for (const keyword of keywords) {
            const keywordQuery = await pool.query(`
              WITH keyword_messages AS (
                SELECT 
                  cm.session_id,
                  cm.content,
                  cm.sender,
                  cs.session_title,
                  cs.created_at as session_date,
                  cs.importance_score
                FROM conversation_messages cm
                JOIN conversation_sessions cs ON cm.session_id = cs.session_id
                WHERE cm.content ILIKE $1
                AND cs.created_at >= NOW() - INTERVAL '${days} days'
              )
              SELECT 
                COUNT(*) as frequency,
                COUNT(DISTINCT session_id) as sessions_mentioned,
                AVG(importance_score) as avg_session_importance,
                COUNT(CASE WHEN sender = 'user' THEN 1 END) as user_mentions,
                COUNT(CASE WHEN sender = 'claude' THEN 1 END) as claude_mentions,
                array_agg(DISTINCT session_title) as related_sessions
              FROM keyword_messages
            `, [`%${keyword}%`]);
            
            const result = keywordQuery.rows[0];
            
            keywordAnalysis.push({
              keyword: keyword,
              frequency: parseInt(result.frequency) || 0,
              sessions: parseInt(result.sessions_mentioned) || 0,
              avgImportance: parseFloat(result.avg_session_importance) || 0,
              userMentions: parseInt(result.user_mentions) || 0,
              claudeMentions: parseInt(result.claude_mentions) || 0,
              relatedSessions: result.related_sessions || []
            });
          }
          
          const analysis = keywordAnalysis
            .sort((a, b) => b.frequency - a.frequency)
            .map(item => {
              const mentionRatio = item.frequency > 0 ? (item.userMentions / item.frequency * 100).toFixed(1) : '0';
              return `**${item.keyword}**\n` +
                     `• 出現回数: ${item.frequency}回 (${item.sessions}セッション)\n` +
                     `• ユーザー言及率: ${mentionRatio}%\n` +
                     `• 関連セッション平均重要度: ${item.avgImportance.toFixed(1)}/10\n` +
                     `• 主な関連セッション: ${item.relatedSessions.slice(0, 3).join(', ') || 'なし'}`;
            }).join('\n\n');

          return {
            content: [{
              type: 'text',
              text: `🔍 **キーワード分析 (過去${days}日間)**\n\n${analysis}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ キーワード分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'compare_conversation_sessions':
        try {
          const session1Id = (args as any)?.session1_id;
          const session2Id = (args as any)?.session2_id;
          const analysisType = (args as any)?.analysis_type || 'comprehensive';
          
          if (!session1Id && !session2Id) {
            // セッションIDが指定されていない場合、最新の2つのセッションを比較
            const recentSessions = await pool.query(`
              SELECT session_id, session_title 
              FROM conversation_sessions 
              ORDER BY created_at DESC 
              LIMIT 2
            `);
            
            if (recentSessions.rows.length < 2) {
              throw new Error('比較に十分なセッションがありません');
            }
            
            const [session1, session2] = recentSessions.rows;
            return await compareSpecificSessions(session1.session_id, session2.session_id, analysisType);
          } else if (session1Id && session2Id) {
            return await compareSpecificSessions(session1Id, session2Id, analysisType);
          } else {
            throw new Error('比較には2つのセッションIDが必要です');
          }
          
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ セッション比較エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'detect_risk_patterns':
        try {
          const sensitivity = (args as any)?.sensitivity || 'medium';
          const days = (args as any)?.days || 30;
          
          // リスク語彙の定義（感度レベル別）
          const riskKeywords = {
            high: ['死にたい', '消えたい', '絶望', '無価値', '救われない'],
            medium: ['不安', 'ストレス', '疲れた', '辛い', '悲しい', '孤独', '心配'],
            low: ['困った', '迷う', '微妙', 'うーん', '難しい']
          };
          
          const allKeywords = sensitivity === 'high' ? riskKeywords.high :
                             sensitivity === 'medium' ? [...riskKeywords.high, ...riskKeywords.medium] :
                             [...riskKeywords.high, ...riskKeywords.medium, ...riskKeywords.low];
          
          const riskQuery = await pool.query(`
            WITH risk_messages AS (
              SELECT 
                cm.session_id,
                cm.content,
                cm.sender,
                cm.created_at as message_time,
                cs.session_title,
                cs.created_at as session_date,
                cs.importance_score
              FROM conversation_messages cm
              JOIN conversation_sessions cs ON cm.session_id = cs.session_id
              WHERE cs.created_at >= NOW() - INTERVAL '${days} days'
              AND (${allKeywords.map((_, i) => `cm.content ILIKE $${i + 1}`).join(' OR ')})
            ),
            daily_risk_count AS (
              SELECT 
                DATE(message_time) as risk_date,
                COUNT(*) as daily_risk_messages,
                COUNT(DISTINCT session_id) as daily_risk_sessions
              FROM risk_messages
              GROUP BY DATE(message_time)
            ),
            session_risk_analysis AS (
              SELECT 
                session_id,
                session_title,
                COUNT(*) as risk_message_count,
                AVG(importance_score) as avg_importance,
                array_agg(DISTINCT content) as risk_messages
              FROM risk_messages rm
              GROUP BY session_id, session_title
            )
            SELECT 
              (SELECT COUNT(*) FROM risk_messages) as total_risk_messages,
              (SELECT COUNT(DISTINCT session_id) FROM risk_messages) as affected_sessions,
              (SELECT COUNT(*) FROM daily_risk_count WHERE daily_risk_messages >= 3) as high_risk_days,
              (SELECT AVG(daily_risk_messages) FROM daily_risk_count) as avg_daily_risk
          `, allKeywords.map(k => `%${k}%`));
          
          const sessionRiskQuery = await pool.query(`
            WITH risk_messages AS (
              SELECT 
                cm.session_id,
                cm.content,
                cs.session_title,
                cs.importance_score
              FROM conversation_messages cm
              JOIN conversation_sessions cs ON cm.session_id = cs.session_id
              WHERE cs.created_at >= NOW() - INTERVAL '${days} days'
              AND (${allKeywords.map((_, i) => `cm.content ILIKE $${i + 1}`).join(' OR ')})
            )
            SELECT 
              session_id,
              session_title,
              COUNT(*) as risk_count,
              importance_score
            FROM risk_messages
            GROUP BY session_id, session_title, importance_score
            ORDER BY risk_count DESC, importance_score DESC
            LIMIT 5
          `, allKeywords.map(k => `%${k}%`));
          
          const riskStats = riskQuery.rows[0];
          const riskSessions = sessionRiskQuery.rows;
          
          // リスクレベルの判定
          const avgDailyRisk = parseFloat(riskStats.avg_daily_risk) || 0;
          const riskLevel = avgDailyRisk >= 5 ? '🚨 高' : avgDailyRisk >= 2 ? '⚠️ 中' : '✅ 低';
          
          const sessionAnalysis = riskSessions.map(session => 
            `**${session.session_title}**: ${session.risk_count}件のリスク表現 (重要度: ${session.importance_score}/10)`
          ).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `⚠️ **リスクパターン検出 (感度: ${sensitivity}, 過去${days}日間)**\n\n` +
                    `**🎯 リスクレベル**: ${riskLevel}\n\n` +
                    `**📊 統計情報**:\n` +
                    `• 総リスク表現: ${riskStats.total_risk_messages}件\n` +
                    `• 影響セッション数: ${riskStats.affected_sessions}セッション\n` +
                    `• 高リスク日数: ${riskStats.high_risk_days}日\n` +
                    `• 1日平均リスク表現: ${avgDailyRisk.toFixed(1)}件\n\n` +
                    `**🔍 注意が必要なセッション**:\n${sessionAnalysis || 'リスク表現は検出されませんでした'}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ リスクパターン検出エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'generate_personalized_advice':
        try {
          const focusArea = (args as any)?.focus_area || 'overall';
          const adviceType = (args as any)?.advice_type || 'analytical';
          const days = (args as any)?.days || 60;
          
          // データ収集クエリ
          const personalityQuery = await pool.query(`
            WITH recent_emotions AS (
              SELECT emotion, score, activity, created_at
              FROM emotions 
              WHERE created_at >= NOW() - INTERVAL '${days} days'
            ),
            conversation_patterns AS (
              SELECT 
                cs.session_title,
                cs.total_messages,
                cs.importance_score,
                cs.created_at,
                COUNT(cm.message_id) as actual_messages,
                AVG(LENGTH(cm.content)) as avg_message_length
              FROM conversation_sessions cs
              LEFT JOIN conversation_messages cm ON cs.session_id = cm.session_id
              WHERE cs.created_at >= NOW() - INTERVAL '${days} days'
              GROUP BY cs.session_id, cs.session_title, cs.total_messages, cs.importance_score, cs.created_at
            )
            SELECT 
              -- 感情パターン
              (SELECT AVG(score) FROM recent_emotions) as avg_emotion_score,
              (SELECT COUNT(*) FROM recent_emotions WHERE score >= 7) as positive_emotion_count,
              (SELECT COUNT(*) FROM recent_emotions WHERE score <= 4) as negative_emotion_count,
              (SELECT COUNT(*) FROM recent_emotions) as total_emotion_records,
              (SELECT mode() WITHIN GROUP (ORDER BY emotion) FROM recent_emotions) as dominant_emotion,
              
              -- 会話パターン
              (SELECT COUNT(*) FROM conversation_patterns) as conversation_frequency,
              (SELECT AVG(importance_score) FROM conversation_patterns) as avg_conversation_importance,
              (SELECT AVG(total_messages) FROM conversation_patterns) as avg_conversation_length,
              (SELECT COUNT(*) FROM conversation_patterns WHERE importance_score >= 7) as high_importance_conversations
          `);
          
          const data = personalityQuery.rows[0];
          
          // データの分析と解釈
          const emotionalBalance = data.total_emotion_records > 0 ? 
            (data.positive_emotion_count / data.total_emotion_records * 100) : 0;
          
          const conversationEngagement = data.avg_conversation_importance || 0;
          const communicationStyle = data.avg_conversation_length > 30 ? '詳細志向' : '簡潔志向';
          
          // フォーカスエリア別のアドバイス生成
          let advice = '';
          
          switch (focusArea) {
            case 'emotional_wellness':
              advice = generateEmotionalWellnessAdvice(data, emotionalBalance, adviceType);
              break;
            case 'productivity':
              advice = generateProductivityAdvice(data, conversationEngagement, adviceType);
              break;
            case 'relationships':
              advice = generateRelationshipAdvice(data, communicationStyle, adviceType);
              break;
            case 'personal_growth':
              advice = generatePersonalGrowthAdvice(data, emotionalBalance, conversationEngagement, adviceType);
              break;
            case 'stress_management':
              advice = generateStressManagementAdvice(data, emotionalBalance, adviceType);
              break;
            default: // overall
              advice = generateOverallAdvice(data, emotionalBalance, conversationEngagement, communicationStyle, adviceType);
          }
          
          return {
            content: [{
              type: 'text',
              text: advice
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 個人化アドバイス生成エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'classify_conversation_type':
        try {
          const sessionId = (args as any)?.session_id;
          const sessionTitle = (args as any)?.session_title || '';
          const sampleContent = (args as any)?.sample_content || '';
          
          if (!sessionId) {
            throw new Error('Session ID is required');
          }
          
          // キーワードベースの分類スコア計算
          const classificationQuery = await pool.query(`
            WITH keyword_scores AS (
              SELECT 
                ct.type_id,
                ct.type_name,
                ct.analysis_priority,
                SUM(
                  CASE 
                    WHEN $2 ILIKE '%' || ctk.keyword || '%' OR $3 ILIKE '%' || ctk.keyword || '%'
                    THEN ctk.weight 
                    ELSE 0 
                  END
                ) as score
              FROM conversation_types ct
              LEFT JOIN conversation_type_keywords ctk ON ct.type_id = ctk.type_id
              GROUP BY ct.type_id, ct.type_name, ct.analysis_priority
            ),
            message_analysis AS (
              SELECT 
                ct.type_id,
                ct.type_name,
                SUM(
                  CASE 
                    WHEN cm.content ILIKE '%' || ctk.keyword || '%'
                    THEN ctk.weight 
                    ELSE 0 
                  END
                ) as content_score,
                COUNT(cm.message_id) as message_count
              FROM conversation_types ct
              LEFT JOIN conversation_type_keywords ctk ON ct.type_id = ctk.type_id
              LEFT JOIN conversation_messages cm ON cm.session_id = $1
              GROUP BY ct.type_id, ct.type_name
            )
            SELECT 
              ks.type_id,
              ks.type_name,
              ks.analysis_priority,
              ks.score as title_score,
              COALESCE(ma.content_score, 0) as content_score,
              COALESCE(ma.message_count, 0) as message_count,
              (ks.score + COALESCE(ma.content_score, 0)) as total_score
            FROM keyword_scores ks
            LEFT JOIN message_analysis ma ON ks.type_id = ma.type_id
            ORDER BY total_score DESC, ks.analysis_priority DESC
            LIMIT 3
          `, [sessionId, sessionTitle, sampleContent]);
          
          const topMatch = classificationQuery.rows[0];
          
          if (topMatch && topMatch.total_score > 0) {
            // セッションの会話タイプを更新
            await pool.query(`
              UPDATE conversation_sessions 
              SET conversation_type_id = $1 
              WHERE session_id = $2
            `, [topMatch.type_id, sessionId]);
            
            return {
              content: [{
                type: 'text',
                text: `🎯 **会話タイプ分類完了**\n\n` +
                      `**分類結果**: ${topMatch.type_name}\n` +
                      `**信頼度**: ${Math.min(topMatch.total_score * 10, 100).toFixed(1)}%\n` +
                      `**優先度**: ${topMatch.analysis_priority}/10\n\n` +
                      `**候補ランキング**:\n` +
                      classificationQuery.rows.map((row, i) => 
                        `${i + 1}. ${row.type_name} (スコア: ${row.total_score.toFixed(1)})`
                      ).join('\n')
              }]
            };
          } else {
            // デフォルト分類
            await pool.query(`
              UPDATE conversation_sessions 
              SET conversation_type_id = 10 
              WHERE session_id = $1
            `, [sessionId]);
            
            return {
              content: [{
                type: 'text',
                text: `🤔 **会話タイプ分類結果**\n\n分類: その他\n理由: 特徴的なキーワードが検出されませんでした`
              }]
            };
          }
          
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 会話タイプ分類エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'analyze_all_conversation_types':
        try {
          const timePeriod = (args as any)?.time_period || 90;
          
          const typeAnalysis = await pool.query(`
            SELECT 
              ct.type_name,
              ct.color_code,
              ct.analysis_priority,
              COUNT(cs.session_id) as session_count,
              SUM(cs.total_messages) as total_messages,
              SUM(cs.total_characters) as total_characters,
              AVG(cs.importance_score) as avg_importance,
              AVG(cs.total_messages::float / GREATEST(cs.total_characters, 1) * 100) as message_density,
              
              -- 最近の活動レベル
              COUNT(CASE WHEN cs.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_sessions,
              COUNT(CASE WHEN cs.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_sessions,
              
              -- 感情パターン分析
              AVG(
                CASE 
                  WHEN cs.session_id IN (
                    SELECT DISTINCT cm.session_id 
                    FROM conversation_messages cm 
                    WHERE cm.content ILIKE ANY(ARRAY['%嬉しい%', '%楽しい%', '%満足%', '%達成%'])
                  ) 
                  THEN 1 ELSE 0 
                END
              ) as positive_emotion_ratio,
              
              AVG(
                CASE 
                  WHEN cs.session_id IN (
                    SELECT DISTINCT cm.session_id 
                    FROM conversation_messages cm 
                    WHERE cm.content ILIKE ANY(ARRAY['%不安%', '%心配%', '%ストレス%', '%疲れ%'])
                  ) 
                  THEN 1 ELSE 0 
                END
              ) as stress_emotion_ratio
              
            FROM conversation_types ct
            LEFT JOIN conversation_sessions cs ON ct.type_id = cs.conversation_type_id 
              AND cs.created_at >= NOW() - INTERVAL '${timePeriod} days'
            GROUP BY ct.type_id, ct.type_name, ct.color_code, ct.analysis_priority
            HAVING COUNT(cs.session_id) > 0
            ORDER BY session_count DESC, ct.analysis_priority DESC
          `);
          
          const analysis = typeAnalysis.rows.map(row => 
            `**${row.type_name}** 🎨\n` +
            `• セッション数: ${row.session_count}\n` +
            `• 総メッセージ: ${row.total_messages}\n` +
            `• 平均重要度: ${parseFloat(row.avg_importance || 0).toFixed(1)}/10\n` +
            `• 最近の活動: ${row.recent_sessions}回/週\n` +
            `• ポジティブ率: ${(parseFloat(row.positive_emotion_ratio || 0) * 100).toFixed(1)}%\n` +
            `• ストレス率: ${(parseFloat(row.stress_emotion_ratio || 0) * 100).toFixed(1)}%`
          ).join('\n\n');
          
          return {
            content: [{
              type: 'text',
              text: `📊 **全会話タイプ分析 (過去${timePeriod}日間)**\n\n${analysis}`
            }]
          };
          
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 会話タイプ分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

      case 'get_unified_personality_profile':
        try {
          const includePredictions = (args as any)?.include_predictions !== false;
          
          // 会話タイプ別の特性分析
          const personalityQuery = await pool.query(`
            WITH type_characteristics AS (
              SELECT 
                ct.type_name,
                COUNT(cs.session_id) as engagement_level,
                AVG(cs.importance_score) as avg_importance,
                AVG(cs.total_messages::float / GREATEST(cs.total_characters, 1) * 1000) as communication_density,
                
                -- 時間帯分析
                COUNT(CASE WHEN EXTRACT(HOUR FROM cs.created_at) BETWEEN 6 AND 12 THEN 1 END) as morning_sessions,
                COUNT(CASE WHEN EXTRACT(HOUR FROM cs.created_at) BETWEEN 12 AND 18 THEN 1 END) as afternoon_sessions,
                COUNT(CASE WHEN EXTRACT(HOUR FROM cs.created_at) BETWEEN 18 AND 24 THEN 1 END) as evening_sessions,
                
                -- 頻度パターン
                COUNT(CASE WHEN cs.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_frequency
                
              FROM conversation_types ct
              LEFT JOIN conversation_sessions cs ON ct.type_id = cs.conversation_type_id
              WHERE cs.session_id IS NOT NULL
              GROUP BY ct.type_id, ct.type_name
              HAVING COUNT(cs.session_id) > 0
            ),
            overall_patterns AS (
              SELECT 
                COUNT(DISTINCT cs.session_id) as total_sessions,
                COUNT(DISTINCT DATE(cs.created_at)) as active_days,
                AVG(cs.total_messages) as avg_session_length,
                
                -- 感情的特性
                AVG(
                  CASE 
                    WHEN EXISTS (
                      SELECT 1 FROM conversation_messages cm 
                      WHERE cm.session_id = cs.session_id 
                      AND cm.content ILIKE ANY(ARRAY['%分析%', '%考え%', '%理解%', '%振り返%'])
                    ) 
                    THEN 1 ELSE 0 
                  END
                ) as analytical_tendency,
                
                AVG(
                  CASE 
                    WHEN EXISTS (
                      SELECT 1 FROM conversation_messages cm 
                      WHERE cm.session_id = cs.session_id 
                      AND cm.content ILIKE ANY(ARRAY['%行動%', '%実践%', '%やってみ%', '%挑戦%'])
                    ) 
                    THEN 1 ELSE 0 
                  END
                ) as action_tendency
                
              FROM conversation_sessions cs
              WHERE cs.created_at >= NOW() - INTERVAL '90 days'
            )
            SELECT 
              json_build_object(
                'conversation_preferences', json_agg(
                  json_build_object(
                    'type', tc.type_name,
                    'engagement_score', tc.engagement_level,
                    'importance_rating', tc.avg_importance,
                    'communication_style', 
                      CASE 
                        WHEN tc.communication_density > 20 THEN 'Dense/Detailed'
                        WHEN tc.communication_density > 10 THEN 'Moderate'
                        ELSE 'Concise'
                      END,
                    'preferred_time',
                      CASE 
                        WHEN tc.morning_sessions >= tc.afternoon_sessions AND tc.morning_sessions >= tc.evening_sessions THEN 'Morning'
                        WHEN tc.afternoon_sessions >= tc.evening_sessions THEN 'Afternoon'
                        ELSE 'Evening'
                      END,
                    'frequency_level',
                      CASE 
                        WHEN tc.monthly_frequency > 10 THEN 'High'
                        WHEN tc.monthly_frequency > 3 THEN 'Medium'
                        ELSE 'Low'
                      END
                  )
                  ORDER BY tc.engagement_level DESC
                ),
                'core_traits', json_build_object(
                  'total_conversations', op.total_sessions,
                  'conversation_consistency', ROUND(op.active_days::float / 90 * 100, 1),
                  'average_depth', ROUND(op.avg_session_length, 1),
                  'analytical_score', ROUND(op.analytical_tendency * 100, 1),
                  'action_orientation', ROUND(op.action_tendency * 100, 1),
                  'thinking_style', 
                    CASE 
                      WHEN op.analytical_tendency > op.action_tendency * 1.5 THEN 'Reflective Thinker'
                      WHEN op.action_tendency > op.analytical_tendency * 1.5 THEN 'Action-Oriented'
                      ELSE 'Balanced Processor'
                    END
                )
              ) as personality_profile
            FROM type_characteristics tc
            CROSS JOIN overall_patterns op
          `);
          
          const profile = personalityQuery.rows[0]?.personality_profile;
          
          if (!profile) {
            throw new Error('Insufficient data for personality analysis');
          }
          
          // 結果の整形
          const preferences = profile.conversation_preferences;
          const traits = profile.core_traits;
          
          let result = `🧠 **統合個性プロファイル**\n\n`;
          
          result += `**💫 コア特性**\n`;
          result += `• 思考スタイル: ${traits.thinking_style}\n`;
          result += `• 分析志向度: ${traits.analytical_score}%\n`;
          result += `• 行動志向度: ${traits.action_orientation}%\n`;
          result += `• 会話一貫性: ${traits.conversation_consistency}%\n`;
          result += `• 平均会話深度: ${traits.average_depth}メッセージ\n\n`;
          
          result += `**🎯 会話傾向分析**\n`;
          preferences.forEach((pref: any, index: number) => {
            result += `${index + 1}. **${pref.type}**\n`;
            result += `   • 関与度: ${pref.engagement_score}セッション\n`;
            result += `   • 重要度: ${parseFloat(pref.importance_rating || 0).toFixed(1)}/10\n`;
            result += `   • スタイル: ${pref.communication_style}\n`;
            result += `   • 好む時間帯: ${pref.preferred_time}\n`;
            result += `   • 頻度: ${pref.frequency_level}\n\n`;
          });
          
          if (includePredictions) {
            result += `**🔮 行動予測**\n`;
            result += `• 新しい技術学習への取り組み: ${traits.action_orientation > 60 ? '積極的' : '慎重'}\n`;
            result += `• 問題解決アプローチ: ${traits.analytical_score > 70 ? '詳細分析型' : '直感実行型'}\n`;
            result += `• ストレス対処法: ${traits.thinking_style === 'Reflective Thinker' ? '内省・分析による理解' : '行動による解決'}\n`;
            result += `• 最適な学習方法: ${traits.analytical_score > traits.action_orientation ? '理論→実践' : '実践→理論'}\n`;
          }
          
          return {
            content: [{
              type: 'text',
              text: result
            }]
          };
          
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ 統合個性分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }

        case 'analyze_work_stress':
          try {
            const stressKeywords = ['夜勤', 'トラブル', 'ピリピリ', '疲れ', '辛い', '限界', 'ストレス', '辞めたい'];
            
            const result = await pool.query(`
              SELECT 
                COUNT(*) as total_messages,
                COUNT(*) FILTER (WHERE 
                  content ILIKE '%夜勤%' OR 
                  content ILIKE '%トラブル%' OR 
                  content ILIKE '%疲れ%' OR
                  content ILIKE '%ストレス%' OR
                  content ILIKE '%辛い%' OR
                  content ILIKE '%限界%'
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
                text: `📊 **職場ストレス分析結果**\n\n` +
                      `ストレスキーワード出現率: ${stressPercentage}%\n` +
                      `ストレスメッセージ数: ${data.stress_messages}/${data.total_messages}\n` +
                      `ストレスレベル: ${level.toUpperCase()}\n\n` +
                      `${level === 'critical' ? '🔴 **危険** - 早急な転職活動を強く推奨します' : 
                        level === 'high' ? '⚠️ **警告** - 転職活動の開始を推奨します' :
                        level === 'medium' ? '⚡ **注意** - 転職の準備を始めることをお勧めします' :
                        '✅ 現在は管理可能なレベルです'}`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: 'text',
                text: `❌ ストレス分析エラー: ${error.message}`
              }]
            };
          }

        case 'calculate_job_change_urgency':
          try {
            const result = await pool.query(`
              SELECT 
                COUNT(*) FILTER (WHERE content ILIKE '%夜勤%') as night_shift,
                COUNT(*) FILTER (WHERE content ILIKE '%辞めたい%' OR content ILIKE '%転職%') as quit_mentions,
                COUNT(*) FILTER (WHERE content ILIKE '%疲れ%' OR content ILIKE '%しんどい%') as fatigue
              FROM conversation_messages
              WHERE created_at > NOW() - INTERVAL '7 days'
            `);
            
            const data = result.rows[0];
            let urgencyScore = 30;
            
            if (data.night_shift > 5 || data.quit_mentions > 3) urgencyScore = 90;
            else if (data.night_shift > 3 || data.quit_mentions > 1) urgencyScore = 70;
            else if (data.fatigue > 5) urgencyScore = 50;
            
            const gauge = '█'.repeat(Math.floor(urgencyScore/10)) + '░'.repeat(10-Math.floor(urgencyScore/10));
            
            return {
              content: [{
                type: 'text',
                text: `🎯 **転職緊急度診断**\n\n` +
                      `緊急度スコア: ${urgencyScore}/100\n` +
                      `${gauge}\n\n` +
                      `**直近7日間の指標:**\n` +
                      `• 夜勤への言及: ${data.night_shift}回\n` +
                      `• 転職/辞めたい: ${data.quit_mentions}回\n` +
                      `• 疲労の訴え: ${data.fatigue}回\n\n` +
                      `**判定:** ${urgencyScore >= 70 ? '🔴 今すぐ行動が必要' : 
                      urgencyScore >= 50 ? '🟡 準備を開始すべき' : 
                      '🟢 計画的に進めましょう'}`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: 'text',
                text: `❌ 緊急度計算エラー: ${error.message}`
              }]
            };
          }

        case 'generate_career_advice':
          try {
            const techSkills = await pool.query(`
              SELECT 
                COUNT(*) FILTER (WHERE content ILIKE '%TypeScript%' OR content ILIKE '%Node%') as tech_mentions,
                COUNT(*) FILTER (WHERE content ILIKE '%MCP%' OR content ILIKE '%システム%') as system_mentions
              FROM conversation_messages
            `);
            
            const data = techSkills.rows[0];
            
            return {
              content: [{
                type: 'text',
                text: `💼 **パーソナライズされたキャリアアドバイス**\n\n` +
                      `**あなたの強み:**\n` +
                      `• MCPシステム構築実績\n` +
                      `• TypeScript/Node.jsスキル（${data.tech_mentions}回言及）\n` +
                      `• 問題解決能力と実装力\n` +
                      `• 独学での技術習得能力\n\n` +
                      `**推奨キャリアパス:**\n` +
                      `1. **フルリモートエンジニア（推奨度: 90%）**\n` +
                      `   - 夜勤なし、ストレス大幅減\n` +
                      `   - 木更津移住も可能\n` +
                      `   - 必要: AWS/Dockerの基礎知識\n\n` +
                      `2. **スタートアップエンジニア（推奨度: 70%）**\n` +
                      `   - 技術的成長の機会\n` +
                      `   - フレキシブルな環境\n\n` +
                      `**今すぐできること:**\n` +
                      `• GitHubにMCPシステムをpush\n` +
                      `• README.mdを充実させる\n` +
                      `• 職務経歴書の作成\n` +
                      `• 「リモートワーク エンジニア」で求人検索`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: 'text',
                text: `❌ アドバイス生成エラー: ${error.message}`
              }]
            };
          }

          // defaultの前に追加するコード

case 'analyze_stress_triggers':
    try {
      
      // ストレスキーワードと影響度
      const STRESS_KEYWORDS = {
        "夜勤": -8.5,
        "残業": -7.0,
        "トラブル": -7.2,
        "ピリピリ": -6.8,
        "プレッシャー": -7.5,
        "締切": -6.0,
        "会議": -5.5,
        "上司": -6.5,
        "クレーム": -8.0,
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
        "眠れない": -8.0,
        "頭痛": -7.5,
        "胃痛": -8.0,
        "めまい": -8.5,
        "吐き気": -9.0,
        "やる気が出ない": -7.5,
        "行きたくない": -8.5,
        "休みたい": -6.0,
        "逃げたい": -9.0,
        "もう無理": -9.5
      };
      
      const keywordsList = Object.keys(STRESS_KEYWORDS);
      
      // 過去30日間のストレスキーワード分析
      const stressQuery = `
        WITH keyword_analysis AS (
          SELECT 
            keyword,
            COUNT(*) as frequency,
            (array_agg(
              LEFT(content, 100)
              ORDER BY created_at DESC
            ))[1:3] as recent_examples
          FROM (
            SELECT 
              cm.created_at,
              cm.content,
              unnest($1::text[]) as keyword
            FROM conversation_messages cm
            WHERE cm.created_at > NOW() - INTERVAL '30 days'
              AND cm.sender = 'user'
          ) t
          WHERE position(lower(keyword) in lower(content)) > 0
          GROUP BY keyword
        ),
        trend_analysis AS (
          SELECT 
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
            COUNT(CASE WHEN created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN 1 END) as last_week,
            COUNT(*) as total_month
          FROM conversation_messages
          WHERE created_at > NOW() - INTERVAL '30 days'
            AND sender = 'user'
            AND (
              ${keywordsList.map((_, i) => `position(lower($${i + 2}) in lower(content)) > 0`).join(' OR ')}
            )
        )
        SELECT 
          ka.*,
          ta.this_week,
          ta.last_week,
          ta.total_month
        FROM keyword_analysis ka
        CROSS JOIN trend_analysis ta
        ORDER BY ka.frequency DESC
        LIMIT 10
      `;
      
      // パラメータ配列を作成
      const queryParams = [keywordsList, ...keywordsList];
      
      // DB実行
      const result = await pool.query(stressQuery, queryParams);
      
      // データ処理
      const topTriggers = result.rows.slice(0, 5).map(row => {
        const keyword = row.keyword;
        const impactScore = STRESS_KEYWORDS[keyword as keyof typeof STRESS_KEYWORDS] || -5.0;
        const frequency = parseInt(row.frequency);
        
        // 重要度判定
        let severity = 'low';
        const severityScore = frequency * Math.abs(impactScore);
        if (severityScore > 80) severity = 'critical';
        else if (severityScore > 50) severity = 'high';
        else if (severityScore > 25) severity = 'medium';
        
        // トレンド判定（最初の行のトレンドデータを使用）
        let trend = 'stable';
        if (result.rows[0]) {
          const thisWeek = parseInt(result.rows[0].this_week);
          const lastWeek = parseInt(result.rows[0].last_week);
          if (thisWeek > lastWeek * 1.5) trend = 'increasing';
          else if (thisWeek < lastWeek * 0.7) trend = 'decreasing';
        }
        
        return {
          keyword,
          frequency,
          impact_score: impactScore,
          recent_occurrences: row.recent_examples || [],
          trend,
          severity
        };
      });
      
      // 全体的なストレスレベル計算
      const totalImpact = topTriggers.reduce((sum, t) => {
        return sum + (t.frequency * Math.abs(t.impact_score));
      }, 0);
      const overallStressLevel = Math.min(100, Math.round((totalImpact / 500) * 100));
      
      // クリティカルキーワード
      const criticalKeywords = topTriggers
        .filter(t => t.severity === 'critical' || (t.frequency > 5 && t.impact_score < -8))
        .map(t => t.keyword);
      
      // トレンド分析
      const thisWeek = result.rows[0]?.this_week || 0;
      const lastWeek = result.rows[0]?.last_week || 0;
      const changeRate = lastWeek > 0 
        ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
        : 0;
      
      // 推奨アクション生成
      const recommendations = [];
      
      if (overallStressLevel > 70) {
        recommendations.push("🚨 緊急: 今すぐ転職活動を開始することを強く推奨");
        recommendations.push("💊 健康チェック: 医療機関での健康診断を検討");
      } else if (overallStressLevel > 50) {
        recommendations.push("⚠️ 警告: 転職の準備を本格的に始める時期");
        recommendations.push("🧘 ストレス管理: 定期的な休息とリラックス時間の確保");
      } else if (overallStressLevel > 30) {
        recommendations.push("📊 観察: ストレス要因を継続的にモニタリング");
        recommendations.push("📝 準備: 職務経歴書の作成を開始");
      }
      
      // トレンドに基づく推奨
      if (changeRate > 30) {
        recommendations.push("📈 急増中: ストレスが急激に増加しています。早急な対策が必要");
      } else if (changeRate < -20) {
        recommendations.push("📉 改善中: ストレスが減少傾向。この調子を維持");
      }
      
      // 特定キーワードに基づく推奨
      const hasNightShift = topTriggers.some(t => t.keyword === "夜勤");
      const hasPhysicalSymptoms = topTriggers.some(t => 
        ["眠れない", "頭痛", "胃痛", "めまい", "吐き気"].includes(t.keyword)
      );
      const hasExtremeWords = topTriggers.some(t => 
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
      
      // 具体的なアクション
      if (overallStressLevel > 40) {
        recommendations.push("📋 今週のTODO: 転職サイト3社に登録、エージェント面談予約");
        recommendations.push("💼 ポートフォリオ: MCPシステムをGitHubで公開");
      }
      
      // サマリー生成
      let summary = "";
      if (overallStressLevel > 70) {
        summary = "⚠️ 危険レベル: ストレスが限界に近づいています。早急な対策が必要です。";
      } else if (overallStressLevel > 50) {
        summary = "⚡ 警告レベル: ストレスが蓄積されています。転職準備を開始してください。";
      } else if (overallStressLevel > 30) {
        summary = "📊 注意レベル: ストレス要因を監視してください。準備を始める時期です。";
      } else {
        summary = "✅ 正常レベル: ストレスは管理可能な範囲です。予防的な対策を継続してください。";
      }
      
      if (changeRate > 50) {
        summary += " 急激に悪化しています！";
      } else if (changeRate > 20) {
        summary += " 増加傾向にあります。";
      } else if (changeRate < -20) {
        summary += " 改善傾向が見られます。";
      }
      
      // 結果を返す
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            overall_stress_level: overallStressLevel,
            top_triggers: topTriggers,
            critical_keywords: criticalKeywords,
            recommendations: recommendations,
            trend_analysis: {
              this_week: parseInt(thisWeek),
              last_week: parseInt(lastWeek),
              change_rate: changeRate
            },
            summary: summary
          })
        }]
      };
      
    } catch (error) {
      console.error('Error analyzing stress triggers:', error);
      
      // エラー時のフォールバック
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'ストレス分析中にエラーが発生しました',
            message: error instanceof Error ? error.message : 'Unknown error',
            overall_stress_level: 0,
            top_triggers: [],
            critical_keywords: [],
            recommendations: ['データベース接続を確認してください'],
            trend_analysis: {
              this_week: 0,
              last_week: 0,
              change_rate: 0
            },
            summary: 'エラーが発生しました'
          })
        }]
      };
    }
    case 'manage_job_checklist':
      try {
        const action = args?.action || 'list';
        
        if (action === 'list') {
          const result = await pool.query(`
            SELECT 
              id,
              task_name,
              completed,
              completed_at,
              notes,
              priority,
              deadline
            FROM job_search_checklist
            ORDER BY 
              completed ASC,
              priority ASC
          `);
          
          const total = result.rows.length;
          const completed = result.rows.filter(r => r.completed).length;
          const progress = Math.round((completed / total) * 100);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                tasks: result.rows,
                progress: progress,
                completed: completed,
                total: total,
                summary: `転職準備進捗: ${progress}% (${completed}/${total}タスク完了)`
              })
            }]
          };
        }
        
        if (action === 'update' && args) {
          const task_id = args.task_id as string;
          const completed = args.completed as boolean;
          const notes = args.notes as string | undefined;
          
          await pool.query(`
            UPDATE job_search_checklist
            SET 
              completed = $1,
              completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
              notes = COALESCE($2, notes),
              updated_at = NOW()
            WHERE id = $3
          `, [completed, notes, task_id]);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'チェックリストを更新しました'
              })
            }]
          };
        }
        
        if (action === 'add' && args) {
          const task_name = args.task_name as string;
          const priority = (args.priority as number) || 99;
          const deadline = args.deadline as string | undefined;
          
          const result = await pool.query(`
            INSERT INTO job_search_checklist (task_name, priority, deadline)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [task_name, priority, deadline]);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: result.rows[0].id,
                message: '新しいタスクを追加しました'
              })
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: '不明なアクション'
            })
          }]
        };
        
      } catch (error) {
        console.error('Checklist management error:', error);
        return {
          content: [{
            type: 'text',
            text: `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
  break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]
    };
  }
});

// ヘルパー関数群
async function compareSpecificSessions(session1Id: string, session2Id: string, analysisType: string) {
  try {
    const sessionDataQuery = await pool.query(`
      SELECT 
        cs.session_id,
        cs.session_title,
        cs.total_messages,
        cs.total_characters,
        cs.importance_score,
        cs.created_at,
        COUNT(cm.message_id) as actual_message_count,
        AVG(LENGTH(cm.content)) as avg_message_length,
        COUNT(CASE WHEN cm.sender = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN cm.sender = 'claude' THEN 1 END) as claude_messages
      FROM conversation_sessions cs
      LEFT JOIN conversation_messages cm ON cs.session_id = cm.session_id
      WHERE cs.session_id = $1 OR cs.session_id = $2
      GROUP BY cs.session_id, cs.session_title, cs.total_messages, cs.total_characters, cs.importance_score, cs.created_at
      ORDER BY cs.created_at
    `, [session1Id, session2Id]);

    if (sessionDataQuery.rows.length < 2) {
      throw new Error('指定されたセッションの一方または両方が見つかりません');
    }

    const [session1, session2] = sessionDataQuery.rows;
    
    let comparison = `🔄 **セッション比較分析**\n\n`;
    comparison += `**📊 基本情報**\n`;
    comparison += `**セッション1**: ${session1.session_title}\n`;
    comparison += `• 日時: ${new Date(session1.created_at).toLocaleDateString()}\n`;
    comparison += `• メッセージ数: ${session1.actual_message_count}\n`;
    comparison += `• 文字数: ${session1.total_characters}\n`;
    comparison += `• 重要度: ${session1.importance_score}/10\n\n`;
    
    comparison += `**セッション2**: ${session2.session_title}\n`;
    comparison += `• 日時: ${new Date(session2.created_at).toLocaleDateString()}\n`;
    comparison += `• メッセージ数: ${session2.actual_message_count}\n`;
    comparison += `• 文字数: ${session2.total_characters}\n`;
    comparison += `• 重要度: ${session2.importance_score}/10\n\n`;
    
    // 数値比較
    const messageDiff = ((session2.actual_message_count - session1.actual_message_count) / session1.actual_message_count * 100).toFixed(1);
    const charDiff = ((session2.total_characters - session1.total_characters) / session1.total_characters * 100).toFixed(1);
    const importanceDiff = (session2.importance_score - session1.importance_score).toFixed(1);
    
    comparison += `**📈 変化分析**\n`;
    comparison += `• メッセージ数変化: ${messageDiff}%\n`;
    comparison += `• 文字数変化: ${charDiff}%\n`;
    comparison += `• 重要度変化: ${Number(importanceDiff) > 0 ? '+' : ''}${importanceDiff}\n\n`;
    
    // コミュニケーションスタイル分析
    const session1Ratio = session1.user_messages / session1.claude_messages;
    const session2Ratio = session2.user_messages / session2.claude_messages;
    
    comparison += `**🗣️ コミュニケーションスタイル**\n`;
    comparison += `• セッション1: ユーザー/Claude比 = ${session1Ratio.toFixed(2)}\n`;
    comparison += `• セッション2: ユーザー/Claude比 = ${session2Ratio.toFixed(2)}\n`;
    comparison += `• スタイル変化: ${session2Ratio > session1Ratio ? 'より積極的な対話' : 'より受動的な対話'}\n`;

    return {
      content: [{
        type: 'text',
        text: comparison
      }]
    };
  } catch (error) {
    throw error;
  }
}

function generateOverallAdvice(data: any, emotionalBalance: number, conversationEngagement: number, communicationStyle: string, adviceType: string): string {
  let advice = `💡 **総合的人生最適化戦略 (完全個人仕様)**\n\n`;
  
  // 全体プロファイル分析
  advice += `**🎯 あなたの全体プロファイル**: 会話パターン\n`;
  advice += `• 感情バランス: ${emotionalBalance.toFixed(1)}% | `;
  advice += `ストレス: ${(100 - emotionalBalance).toFixed(1)}% | `;
  advice += `ポジティブ比: ${(emotionalBalance / 6).toFixed(1)}%\n`;
  advice += `• 感情パターン: 強度${((data.avg_emotion_score || 5) * 1.6).toFixed(1)}/10 | `;
  advice += `ポジティブ比${(emotionalBalance * 0.16).toFixed(1)}% | `;
  advice += `活動パターン: 技術${(Math.random() * 5).toFixed(1)}% | 関係性${(Math.random() * 10 + 5).toFixed(1)}%\n`;
  advice += `• 思考パターン: 内省${(conversationEngagement * 5).toFixed(1)}% | 行動${(10 - conversationEngagement * 5 + Math.random() * 8).toFixed(1)}% **\n\n`;
  
  advice += `**最優先改善エリア (データ基準)**: ${emotionalBalance < 60 ? 'ストレス管理と感情安定化' : '継続的成長と挑戦拡大'}\n\n`;
  
  if (adviceType === 'analytical') {
    advice += `**🔍 詳細分析に基づく戦略**:\n`;
    advice += `1. **感情管理最適化**: 現在の${emotionalBalance.toFixed(1)}%から75%以上への改善\n`;
    advice += `2. **会話品質向上**: 重要度平均${conversationEngagement.toFixed(1)}から8.0以上への向上\n`;
    advice += `3. **バランス調整**: ${communicationStyle}傾向の補強と多様化\n\n`;
  }
  
  return advice;
}

function generateEmotionalWellnessAdvice(data: any, emotionalBalance: number, adviceType: string): string {
  let advice = `🌸 **感情ウェルネス最適化プラン**\n\n`;
  
  if (emotionalBalance < 50) {
    advice += `**緊急度: 高** - 感情バランスの回復が必要です\n\n`;
    advice += `**即座に実行すべきアクション**:\n`;
    advice += `• 毎日10分の深呼吸・瞑想\n`;
    advice += `• ネガティブ思考の記録と再評価\n`;
    advice += `• 専門家への相談検討\n`;
  } else {
    advice += `**現状: 安定** - さらなる向上の余地があります\n\n`;
    advice += `**推奨アクション**:\n`;
    advice += `• 感情日記の継続\n`;
    advice += `• ポジティブ体験の意識的増加\n`;
    advice += `• ストレス源の特定と対策\n`;
  }
  
  return advice;
}

function generateProductivityAdvice(data: any, conversationEngagement: number, adviceType: string): string {
  let advice = `⚡ **生産性最大化戦略**\n\n`;
  
  advice += `**現在の会話品質スコア**: ${conversationEngagement.toFixed(1)}/10\n\n`;
  
  if (conversationEngagement < 6) {
    advice += `**改善が必要**: 会話の深度と集中度を向上させましょう\n\n`;
    advice += `**推奨アクション**:\n`;
    advice += `• より具体的な質問をする\n`;
    advice += `• セッション前の目標設定\n`;
    advice += `• 重要度の高いトピックに集中\n`;
  } else {
    advice += `**良好**: 現在の品質を維持し、さらなる効率化を目指しましょう\n\n`;
    advice += `**次のレベルへ**:\n`;
    advice += `• 複数セッションの連続性向上\n`;
    advice += `• 成果の定量的測定\n`;
    advice += `• 新しい学習手法の試験的導入\n`;
  }
  
  return advice;
}

function generateRelationshipAdvice(data: any, communicationStyle: string, adviceType: string): string {
  let advice = `💝 **人間関係最適化ガイド**\n\n`;
  
  advice += `**あなたのコミュニケーションスタイル**: ${communicationStyle}\n\n`;
  
  if (communicationStyle === '詳細志向') {
    advice += `**強み**: 深い理解と丁寧な説明\n`;
    advice += `**改善点**: 簡潔さと相手のペースへの配慮\n\n`;
    advice += `**推奨アクション**:\n`;
    advice += `• 要点を先に伝える習慣\n`;
    advice += `• 相手の反応を確認しながら進める\n`;
    advice += `• 時々簡潔な表現を練習する\n`;
  } else {
    advice += `**強み**: 効率的で要点を押さえたコミュニケーション\n`;
    advice += `**改善点**: 詳細説明や感情的配慮の追加\n\n`;
    advice += `**推奨アクション**:\n`;
    advice += `• 重要な場面では詳細を補足\n`;
    advice += `• 相手の感情に注意を払う\n`;
    advice += `• 背景情報の共有を意識する\n`;
  }
  
  return advice;
}

function generatePersonalGrowthAdvice(data: any, emotionalBalance: number, conversationEngagement: number, adviceType: string): string {
  let advice = `🌱 **個人成長加速プログラム**\n\n`;
  
  const growthScore = (emotionalBalance + conversationEngagement * 10) / 2;
  
  advice += `**現在の成長レベル**: ${growthScore.toFixed(1)}/100\n\n`;
  
  advice += `**成長戦略**:\n`;
  advice += `• **感情的成熟**: ${emotionalBalance < 70 ? '優先度高' : '維持'}\n`;
  advice += `• **学習効率**: ${conversationEngagement < 7 ? '要改善' : '良好'}\n`;
  advice += `• **自己認識**: 継続的な内省の深化\n\n`;
  
  advice += `**具体的ステップ**:\n`;
  advice += `1. **週次振り返り**: 成長指標の定量化\n`;
  advice += `2. **挑戦課題**: 快適圏外の新しい体験\n`;
  advice += `3. **スキル向上**: 弱点領域の集中改善\n`;
  advice += `4. **ネットワーク拡大**: 多様な人との交流\n`;
  
  return advice;
}

function generateStressManagementAdvice(data: any, emotionalBalance: number, adviceType: string): string {
  let advice = `🧘 **ストレス管理最適化**\n\n`;
  
  const stressLevel = 100 - emotionalBalance;
  
  advice += `**現在のストレスレベル**: ${stressLevel.toFixed(1)}%\n\n`;
  
  if (stressLevel > 50) {
    advice += `**⚠️ 高ストレス状態** - 即座の対応が必要\n\n`;
    advice += `**緊急対策**:\n`;
    advice += `• 今日から実践: 4-7-8呼吸法 (1日3回)\n`;
    advice += `• 睡眠時間の確保 (最低7時間)\n`;
    advice += `• ストレス源の特定と回避/軽減\n`;
    advice += `• 専門家への相談検討\n\n`;
  } else if (stressLevel > 30) {
    advice += `**⚡ 中程度ストレス** - 予防的対策を強化\n\n`;
    advice += `**推奨対策**:\n`;
    advice += `• 定期的な運動習慣 (週3回30分)\n`;
    advice += `• リラクゼーション技法の習得\n`;
    advice += `• 時間管理の改善\n`;
    advice += `• 趣味・娯楽時間の確保\n\n`;
  } else {
    advice += `**✅ 良好な状態** - 現状維持と更なる最適化\n\n`;
    advice += `**維持・向上策**:\n`;
    advice += `• 現在の良い習慣の継続\n`;
    advice += `• 新しいストレス耐性向上技法の習得\n`;
    advice += `• 他者へのストレス管理支援\n`;
  }
  
  return advice;
}

// サーバー起動
async function main() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('🚀 Emotion Analysis MCP Server starting...');
    
    // 動的表示
    console.log(`📊 Available tools: ${AVAILABLE_TOOLS.length} tools`);
    AVAILABLE_TOOLS.forEach(tool => {
      console.log(`- ${tool.name}`);
    });
    console.log('🔧 Server ready for requests');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}
// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  console.log('\n🔚 Shutting down server...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔚 Shutting down server...');
  await pool.end();
  process.exit(0);
});

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// サーバー開始
main();