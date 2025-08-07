const dotenv = require('dotenv');
dotenv.config();

import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

// データベース接続設定
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'emotion_analysis',
  user: 'mkykr',
  password: process.env.DB_PASSWORD
});

// 会話データ取り込み関数
async function importConversationFile(filePath, sessionTitle, sessionNumber, importanceScore = 7.0) {
  try {
    console.log(`📖 読み込み開始: ${filePath}`);
    
    // ファイル読み込み
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    console.log(`📝 総行数: ${lines.length}`);
    console.log(`📏 総文字数: ${content.length}`);
    
    // セッション作成
    const sessionResult = await pool.query(`
      INSERT INTO conversation_sessions (
        session_title, session_number, total_characters, 
        importance_score, start_date, session_summary
      ) VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING session_id
    `, [
      sessionTitle, 
      sessionNumber, 
      content.length,
      importanceScore,
      `${sessionTitle}の会話データ - ${lines.length}行のメッセージ`
    ]);
    
    const sessionId = sessionResult.rows[0].session_id;
    console.log(`✅ セッション作成完了: ${sessionId}`);
    
    // メッセージ解析・登録（簡易版）
    let messageCount = 0;
    let currentSender = 'user';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 10) continue; // 短すぎる行はスキップ
      
      // 送信者判定（簡易的）
      if (line.includes('Claude') || line.includes('私は') || line.includes('分析') || line.includes('考え')) {
        currentSender = 'claude';
      } else if (line.includes('私') || line.includes('自分') || line.includes('思う')) {
        currentSender = 'user';
      }
      
      await pool.query(`
        INSERT INTO conversation_messages (
          session_id, message_sequence, sender, content, message_length
        ) VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, i + 1, currentSender, line, line.length]);
      
      messageCount++;
    }
    
    // セッション情報更新
    await pool.query(`
      UPDATE conversation_sessions 
      SET total_messages = $1 
      WHERE session_id = $2
    `, [messageCount, sessionId]);
    
    console.log(`🎯 メッセージ登録完了: ${messageCount}件`);
    console.log(`✨ ${sessionTitle} インポート成功!\n`);
    
    return { sessionId, messageCount, totalChars: content.length };
    
  } catch (error) {
    console.error(`❌ エラー in ${filePath}:`, error.message);
    throw error;
  }
}

// メイン実行
async function main() {
  try {
    console.log('🚀 会話データ取り込み開始\n');
    
    // データファイルの場所確認（必要に応じて修正）
    const conversations = [
      {
        file: './conversations/test.txt',
        title: 'テスト会話',
        number: 999,
        portance: 5.0
      },
      {
        file: './conversations/クロード自己分析.txt',
        title: '自己分析（オリジナル）',
        number: 0,
        importance: 8.0
      },
      {
        file: './conversations/クロード自己分析1.txt', 
        title: '自己分析①',
        number: 1,
        importance: 7.5
      },
      {
        file: './conversations/クロード自己分析2.txt',
        title: '自己分析②', 
        number: 2,
        importance: 8.5
      }
    ];
    
    const results = [];
    for (const conv of conversations) {
      if (fs.existsSync(conv.file)) {
        const result = await importConversationFile(conv.file, conv.title, conv.number, conv.importance);
        results.push(result);
      } else {
        console.log(`⚠️  ファイルが見つかりません: ${conv.file}`);
      }
    }
    
    console.log('🎉 全ての取り込み完了!');
    console.log('📊 結果サマリー:');
    results.forEach((result, i) => {
      console.log(`  ${i+1}. セッション: ${result.sessionId.substring(0,8)}... | メッセージ: ${result.messageCount} | 文字数: ${result.totalChars}`);
    });
    
  } catch (error) {
    console.error('💥 メイン処理エラー:', error);
  } finally {
    await pool.end();
  }
}

// 実行
main();
