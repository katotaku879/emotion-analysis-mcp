import { pool } from './config.js';

export const conversationQueries = {
  // 特定セッションの詳細分析
  async getSessionAnalysis(sessionNumber: number) {
    const result = await pool.query(`
      SELECT 
        cs.session_title,
        cs.total_messages,
        cs.total_characters,
        cs.importance_score,
        cs.created_at,
        COUNT(DISTINCT cm.sender) as unique_senders,
        AVG(cm.message_length) as avg_message_length
      FROM conversation_sessions cs
      LEFT JOIN conversation_messages cm ON cs.session_id = cm.session_id
      WHERE cs.session_number = $1
      GROUP BY cs.session_id, cs.session_title, cs.total_messages, cs.total_characters, cs.importance_score, cs.created_at
    `, [sessionNumber]);
    
    return result.rows[0];
  },

  // 感情データと会話データの横断分析
  async getCrossAnalysis(days: number = 30) {
    const result = await pool.query(`
      SELECT 
        DATE(el.date) as analysis_date,
        COUNT(el.id) as emotion_records,
        AVG(el.intensity) as avg_emotion_intensity,
        COUNT(cm.message_id) as conversation_messages,
        STRING_AGG(DISTINCT et.name, ', ') as emotions_recorded
      FROM emotion_logs el
      LEFT JOIN emotion_types et ON el.emotion_type_id = et.id
      LEFT JOIN conversation_messages cm ON DATE(el.date) = DATE(cm.timestamp)
      WHERE el.date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(el.date)
      ORDER BY analysis_date DESC
      LIMIT 10
    `);
    
    return result.rows;
  },

  // 会話からの洞察発見
  async getConversationInsights(importanceThreshold: number = 7) {
    const result = await pool.query(`
      SELECT 
        cs.session_title,
        cs.importance_score,
        cs.total_messages,
        cs.created_at,
        (
          SELECT STRING_AGG(cm.content, ' ' ORDER BY cm.message_sequence)
          FROM conversation_messages cm 
          WHERE cm.session_id = cs.session_id 
          AND cm.sender = 'user'
          AND LENGTH(cm.content) > 50
          LIMIT 5
        ) as key_user_messages,
        (
          SELECT COUNT(*)
          FROM conversation_messages cm 
          WHERE cm.session_id = cs.session_id 
          AND cm.content ILIKE '%感情%'
        ) as emotion_mentions
      FROM conversation_sessions cs
      WHERE cs.importance_score >= $1
      AND cs.session_number IS NOT NULL
      ORDER BY cs.importance_score DESC, cs.created_at DESC
    `, [importanceThreshold]);
    
    return result.rows;
  },

  // トピック分析
  async getTopicAnalysis() {
    const result = await pool.query(`
      SELECT 
        cs.session_title,
        COUNT(CASE WHEN cm.content ILIKE '%ストレス%' OR cm.content ILIKE '%不安%' THEN 1 END) as stress_mentions,
        COUNT(CASE WHEN cm.content ILIKE '%嬉しい%' OR cm.content ILIKE '%楽しい%' THEN 1 END) as positive_mentions,
        COUNT(CASE WHEN cm.content ILIKE '%仕事%' OR cm.content ILIKE '%キャリア%' THEN 1 END) as career_mentions,
        COUNT(CASE WHEN cm.content ILIKE '%人間関係%' OR cm.content ILIKE '%友達%' THEN 1 END) as relationship_mentions,
        cs.total_messages
      FROM conversation_sessions cs
      JOIN conversation_messages cm ON cs.session_id = cm.session_id
      WHERE cs.session_number IS NOT NULL
      GROUP BY cs.session_id, cs.session_title, cs.total_messages
      ORDER BY cs.session_number
    `);
    
    return result.rows;
  }
};
