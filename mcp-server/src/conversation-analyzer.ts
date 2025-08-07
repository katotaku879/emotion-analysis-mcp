import { pool } from './database/config.js';

export async function analyzeConversationThemes() {
  const result = await pool.query(`
    SELECT 
      cs.session_title,
      cs.session_number,
      COUNT(cm.message_id) as message_count,
      COUNT(CASE WHEN cm.content ILIKE '%不安%' OR cm.content ILIKE '%心配%' OR cm.content ILIKE '%悩%' THEN 1 END) as anxiety_mentions,
      COUNT(CASE WHEN cm.content ILIKE '%成長%' OR cm.content ILIKE '%変化%' OR cm.content ILIKE '%発展%' THEN 1 END) as growth_mentions,
      COUNT(CASE WHEN cm.content ILIKE '%人間関係%' OR cm.content ILIKE '%友達%' OR cm.content ILIKE '%恋愛%' THEN 1 END) as relationship_mentions,
      COUNT(CASE WHEN cm.content ILIKE '%仕事%' OR cm.content ILIKE '%キャリア%' OR cm.content ILIKE '%転職%' THEN 1 END) as career_mentions,
      COUNT(CASE WHEN cm.content ILIKE '%将来%' OR cm.content ILIKE '%目標%' OR cm.content ILIKE '%夢%' THEN 1 END) as future_mentions,
      STRING_AGG(CASE WHEN LENGTH(cm.content) > 100 AND cm.sender = 'user' THEN LEFT(cm.content, 100) END, ' | ' ORDER BY cm.message_sequence) as sample_user_content
    FROM conversation_sessions cs
    JOIN conversation_messages cm ON cs.session_id = cm.session_id
    WHERE cs.session_number IS NOT NULL
    GROUP BY cs.session_id, cs.session_title, cs.session_number
    ORDER BY cs.session_number
  `);
  
  return result.rows;
}

export async function analyzeGrowthPatterns() {
  const result = await pool.query(`
    SELECT 
      cs.session_title,
      cs.session_number,
      cs.created_at,
      cs.importance_score,
      (
        SELECT COUNT(*)
        FROM conversation_messages cm 
        WHERE cm.session_id = cs.session_id 
        AND cm.sender = 'user'
        AND (cm.content ILIKE '%自分%' OR cm.content ILIKE '%気づ%' OR cm.content ILIKE '%理解%')
      ) as self_awareness_mentions,
      (
        SELECT COUNT(*)
        FROM conversation_messages cm 
        WHERE cm.session_id = cs.session_id 
        AND cm.sender = 'user'
        AND (cm.content ILIKE '%変わり%' OR cm.content ILIKE '%改善%' OR cm.content ILIKE '%成長%')
      ) as change_mentions,
      (
        SELECT AVG(LENGTH(cm.content))
        FROM conversation_messages cm 
        WHERE cm.session_id = cs.session_id 
        AND cm.sender = 'user'
      ) as avg_message_depth
    FROM conversation_sessions cs
    WHERE cs.session_number IS NOT NULL
    ORDER BY cs.session_number
  `);
  
  return result.rows;
}

export async function compareEmotionalExpression(days: number = 30) {
  const result = await pool.query(`
    SELECT 
      'recorded_emotions' as source,
      COUNT(*) as count,
      AVG(el.intensity) as avg_intensity,
      STRING_AGG(DISTINCT et.name, ', ') as emotion_types
    FROM emotion_logs el
    JOIN emotion_types et ON el.emotion_type_id = et.id
    WHERE el.date >= CURRENT_DATE - INTERVAL '${days} days'
    
    UNION ALL
    
    SELECT 
      'conversation_emotions' as source,
      COUNT(*) as count,
      NULL as avg_intensity,
      STRING_AGG(DISTINCT 
        CASE 
          WHEN cm.content ILIKE '%嬉しい%' OR cm.content ILIKE '%楽しい%' THEN '喜び'
          WHEN cm.content ILIKE '%悲しい%' OR cm.content ILIKE '%つらい%' THEN '悲しみ'
          WHEN cm.content ILIKE '%不安%' OR cm.content ILIKE '%心配%' THEN '不安'
          WHEN cm.content ILIKE '%怒り%' OR cm.content ILIKE '%イライラ%' THEN '怒り'
          WHEN cm.content ILIKE '%満足%' OR cm.content ILIKE '%充実%' THEN '満足'
        END, ', '
      ) as emotion_types
    FROM conversation_messages cm
    JOIN conversation_sessions cs ON cm.session_id = cs.session_id
    WHERE cs.created_at >= CURRENT_DATE - INTERVAL '${days} days'
    AND cs.session_number IS NOT NULL
    AND (
      cm.content ILIKE '%嬉しい%' OR cm.content ILIKE '%楽しい%' OR
      cm.content ILIKE '%悲しい%' OR cm.content ILIKE '%つらい%' OR
      cm.content ILIKE '%不安%' OR cm.content ILIKE '%心配%' OR
      cm.content ILIKE '%怒り%' OR cm.content ILIKE '%イライラ%' OR
      cm.content ILIKE '%満足%' OR cm.content ILIKE '%充実%'
    )
  `);
  
  return result.rows;
}
