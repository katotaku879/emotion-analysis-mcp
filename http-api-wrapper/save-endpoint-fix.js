// 修正版の保存エンドポイント
app.post('/api/conversations/save', async (req, res) => {
  const { messages } = req.body;
  console.log(`📝 Saving ${messages?.length || 0} messages...`);
  
  try {
    let savedCount = 0;
    const sessionId = '2e50ff7a-3c28-423e-a4f4-165e16017766';
    
    // 現在の最大message_sequenceを取得
    const maxSeqResult = await pool.query(
      'SELECT COALESCE(MAX(message_sequence), 0) as max_seq FROM conversation_messages WHERE session_id = $1',
      [sessionId]
    );
    let currentSeq = parseInt(maxSeqResult.rows[0].max_seq);
    
    for (const msg of messages || []) {
      currentSeq++;
      
      const result = await pool.query(`
        INSERT INTO conversation_messages 
        (session_id, message_sequence, sender, content, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING message_id
      `, [
        sessionId,
        currentSeq,
        msg.role === 'user' ? 'user' : 'claude',
        msg.content,
        new Date(msg.timestamp || Date.now())
      ]);
      
      if (result.rows.length > 0) {
        savedCount++;
        console.log(`✅ Saved message ${currentSeq}: ${msg.content.substring(0, 50)}...`);
      }
    }
    
    console.log(`✅ Total saved: ${savedCount} messages`);
    res.json({ success: true, saved: savedCount });
  } catch (error) {
    console.error('❌ Save error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
