import { pool } from './database/config.js';

export async function getConversationStats() {
  const result = await pool.query(`
    SELECT 
      cs.session_title,
      cs.total_messages,
      cs.total_characters,
      cs.importance_score
    FROM conversation_sessions cs
    WHERE cs.session_number IS NOT NULL
    ORDER BY cs.session_number
  `);
  
  return result.rows;
}
