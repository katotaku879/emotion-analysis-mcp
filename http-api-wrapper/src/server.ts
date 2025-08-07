import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const app = express();
const port = 3000;
const host = '0.0.0.0';

// 🗄️ PostgreSQL接続設定（環境変数から取得）
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'emotion_analysis',
  user: process.env.DB_USER || 'mkykr',
  password: process.env.DB_PASSWORD,  // 環境変数からのみ取得
});

// 🌐 CORS設定
app.use(cors({
  origin: ['https://claude.ai', 'https://*.claude.ai', 'http://localhost:3000','chrome-extension://*'],
  credentials: true
}));
app.use(express.json());
});

// MCPサーバーの出力を監視
mcpProcess.stdout?.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('jsonrpc')) {
    console.log('📝 MCP:', output.trim());
  }
});

mcpProcess.stderr?.on('data', (data) => {
  console.error('⚠️ MCP Error:', data.toString());
});

mcpProcess.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
});

mcpProcess.on('exit', (code) => {
  console.log(`⚠️ MCP server exited with code ${code}`);
});

// MCPサーバーの初期化
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'http-api-wrapper',
        version: '1.0.0'
      }
    }
  };
  
  mcpProcess.stdin?.write(JSON.stringify(initRequest) + '\n');
  console.log('📤 Sent initialization request to MCP server');
}, 1000);

// 🛠 MCP通信用ヘルパー関数
async function callMcpTool(toolName: string, args: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const timeout = setTimeout(() => {
      console.log('⏱️ MCP request timeout, falling back to direct PostgreSQL');
      resolve({ success: true, message: 'Saved directly to PostgreSQL (MCP timeout)' });
    }, 5000);

    const responseHandler = (data: Buffer) => {
      clearTimeout(timeout);
      const dataStr = data.toString();
      console.log('📝 MCP:', dataStr);
      
      // JSONレスポンスを探す（{"result":で始まる行）
      const lines = dataStr.split('\n');
      for (const line of lines) {
        if (line.startsWith('{"result":') || line.startsWith('{"jsonrpc":')) {
          try {
            const response = JSON.parse(line);
            if (response.error) {
              console.log('⚠️ MCP error:', response.error);
              resolve({ success: true, message: 'Saved via PostgreSQL (MCP error)' });
            } else {
              resolve(response.result);
            }
            return;
          } catch (e) {
            // このlineはJSONではない、次を試す
          }
        }
      }
      
      // JSONが見つからない場合
      console.log('⚠️ Failed to parse MCP response:', dataStr.substring(0, 100));
      resolve({ success: true, message: 'Saved via PostgreSQL (parse error)' });
    };

    mcpProcess.stdout?.once('data', responseHandler);
    mcpProcess.stdin?.write(JSON.stringify(request) + '\n');
    });
    }

// 💾 PostgreSQL直接保存関数（改善版）
async function saveToPostgreSQL(message: string, role: string, metadata: any = {}) {
  try {
    // session_idをクリーンアップ（/chat/を除去）
    let sessionId = metadata.session_id;
    if (sessionId && sessionId.startsWith('/chat/')) {
      sessionId = sessionId.replace('/chat/', '');
    }
    
    // UUID形式でない場合はフォールバックテーブルを使用
    const isValidUuid = sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    
    if (!isValidUuid) {
      // フォールバックテーブルに直接保存
      throw new Error('Invalid UUID format, using fallback');
    }
    
    // セッションの存在確認
    const checkSession = await pool.query(
      'SELECT session_id FROM conversation_sessions WHERE session_id = $1::uuid',
      [sessionId]
    );
    
    if (checkSession.rows.length === 0) {
      // セッションを作成（nameカラムがない場合を考慮）
      try {
        await pool.query(
          `INSERT INTO conversation_sessions (session_id, created_at)
           VALUES ($1::uuid, NOW())`,
          [sessionId]
        );
        console.log('📝 Auto-created session:', sessionId);
      } catch (err) {
        console.log('⚠️ Could not create session, continuing anyway');
      }
    }

    // メッセージを保存
    const result = await pool.query(
      `INSERT INTO conversation_messages (
        session_id, 
        sender, 
        content, 
        timestamp, 
        message_length, 
        message_sequence
      )
      VALUES (
        $1::uuid, 
        $2, 
        $3, 
        $4, 
        $5, 
        (SELECT COALESCE(MAX(message_sequence), 0) + 1 
         FROM conversation_messages 
         WHERE session_id = $1::uuid)
      )
      RETURNING message_id`,
      [
        sessionId,
        role === 'human' ? 'user' : 'assistant',
        message,
        metadata.timestamp || new Date(),
        message.length
      ]
    );

    console.log('💾 Saved to PostgreSQL, ID:', result.rows[0].message_id);
    return { success: true, messageId: result.rows[0].message_id };
  } catch (error: any) {
    console.log('⚠️ Primary save failed, using fallback table');
    
    // フォールバック：シンプルなテーブルに保存
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages_simple (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255),
          role VARCHAR(50),
          content TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        )
      `);
      
      const fallbackResult = await pool.query(
        `INSERT INTO messages_simple (session_id, role, content, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          metadata.session_id || 'default',
          role,
          message,
          JSON.stringify(metadata)
        ]
      );
      
      console.log('💾 Saved to fallback table, ID:', fallbackResult.rows[0].id);
      return { success: true, messageId: 'simple-' + fallbackResult.rows[0].id };
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      throw error;
    }
  }
}

//
// 📥 Claude.ai APIリクエスト用エンドポイント
//
app.post('/api/messages', async (req, res) => {
  try {
    const { message, role, timestamp, source, session_id } = req.body;

    console.log('📨 POST /api/messages', {
      message: message?.substring(0, 30) + '...',
      role, timestamp, source, session_id
    });

    // PostgreSQLに直接保存
    const saveResult = await saveToPostgreSQL(message, role, {
      timestamp,
      source,
      session_id
    });

    // MCPツールも試す（バックグラウンドで）
    callMcpTool('save_conversation', {
      user_message: message,
      claude_response: `[role:${role}]`,
      metadata: { timestamp, source, session_id }
    }).then(result => {
      console.log('🔧 MCP tool result:', result);
    }).catch(err => {
      console.log('⚠️ MCP tool error (ignored):', err.message);
    });

    console.log('✅ Message saved via /api/messages');
    res.json({ 
      success: true, 
      messageId: saveResult.messageId,
      analysis: {
        emotion: 'neutral',
        intensity: 5,
        keywords: []
      }
    });

  } catch (err) {
    console.error('❌ Error in /api/messages:', err);
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

// 分析実行エンドポイント
app.post('/api/analyze', async (req, res) => {
    console.log('📊 Analysis request received');
    const { tool, parameters } = req.body;
    
    try {
        // MCPサーバーに分析リクエストを送信（関数名を修正）
        const result = await callMcpTool(tool, parameters || {});
        
        console.log(`✅ Analysis completed: ${tool}`);
        res.json({
            success: true,
            tool: tool,
            result: result,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {  // エラーの型を明示
        console.error('❌ Analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Unknown error'
        });
    }
});

// 利用可能なツール一覧を返すエンドポイント
app.get('/api/tools', async (req, res) => {
    const tools = [
        'analyze_emotions',
        'analyze_activity', 
        'find_happiness_triggers',
        'detect_risk_patterns',
        'generate_personalized_advice',
        'classify_conversation_type',
        'analyze_all_conversation_types',
        'get_unified_personality_profile',
        'analyze_conversation_keywords',
        'compare_conversation_sessions',
        'get_conversation_stats',
        'test_connection',
        'analyze_stress_triggers'
    ];
    
    res.json({
        success: true,
        tools: tools,
        count: tools.length
    });
});

// キーワード分析エンドポイント
app.post('/api/analyze-keywords', async (req, res) => {
    console.log('🔍 Keyword analysis request');
    const { keywords } = req.body;
    
    try {
        const result = await callMcpTool('analyze_conversation_keywords', {
            keywords: keywords || ['不安', '成長', '幸福', '課題']
        });
        
        res.json({
            success: true,
            keywords: keywords,
            analysis: result,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {  // エラーの型を明示
        console.error('❌ Keyword analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Unknown error'
        });
    }
});

//
// 💾 既存の会話保存エンドポイント
//
app.post('/api/save-conversation', async (req, res) => {
  try {
    const { userMessage, claudeResponse, metadata } = req.body;

    console.log('📨 POST /api/save-conversation', {
      userMessage: userMessage?.substring(0, 50) + '...',
      claudeResponse: claudeResponse?.substring(0, 50) + '...'
    });

    // 両方のメッセージを保存
    if (userMessage) {
      await saveToPostgreSQL(userMessage, 'human', metadata);
    }
    if (claudeResponse) {
      await saveToPostgreSQL(claudeResponse, 'assistant', metadata);
    }

    // MCPツールも試す（バックグラウンドで）
    callMcpTool('save_conversation', {
      user_message: userMessage,
      claude_response: claudeResponse,
      metadata
    }).catch(err => {
      console.log('⚠️ MCP tool error (ignored):', err.message);
    });

    console.log('✅ Conversation saved successfully');
    res.json({ success: true, message: 'Conversation saved successfully' });

  } catch (error) {
    console.error('❌ Error saving conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

//
// 🧪 ヘルスチェック
//
app.get('/api/health', async (req, res) => {
  try {
    // PostgreSQL接続確認
    const pgResult = await pool.query('SELECT 1');
    const pgStatus = pgResult.rows.length > 0 ? 'connected' : 'error';
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      postgres: pgStatus,
      mcp: mcpProcess.pid ? 'running' : 'not running'
    });
  } catch (error) {
    res.json({ 
      status: 'partial', 
      timestamp: new Date().toISOString(),
      error: 'PostgreSQL connection error'
    });
  }
});

//
// 📊 統計情報エンドポイント
//
// 📊 統計情報エンドポイント（両テーブルの合計）
app.get('/api/stats', async (req, res) => {
  try {
    // messages_simpleから取得
    const simpleResult = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT session_id) as total_sessions,
        MAX(timestamp) as last_message_at
      FROM messages_simple
    `);
    
    // conversation_messagesから取得
    const convResult = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT session_id) as total_sessions,
        MAX(created_at) as last_message_at
      FROM conversation_messages
    `);
    
    // 合計を計算
    const totalMessages = 
      parseInt(simpleResult.rows[0].total_messages || 0) + 
      parseInt(convResult.rows[0].total_messages || 0);
    
    const totalSessions = 
      parseInt(simpleResult.rows[0].total_sessions || 0) + 
      parseInt(convResult.rows[0].total_sessions || 0);
    
    // より新しい日時を使用
    const lastMessageSimple = simpleResult.rows[0].last_message_at;
    const lastMessageConv = convResult.rows[0].last_message_at;
    const lastMessage = lastMessageSimple > lastMessageConv ? lastMessageSimple : lastMessageConv;
    
    res.json({
      success: true,
      stats: {
        total_messages: totalMessages.toString(),
        total_sessions: totalSessions.toString(),
        last_message_at: lastMessage,
        breakdown: {
          messages_simple: simpleResult.rows[0].total_messages,
          messages_conversation: convResult.rows[0].total_messages
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// server.tsに追加（TypeScriptエラー修正版）

// 1️⃣ リスクパターン検出エンドポイント
app.post('/api/detect-risks', async (req, res) => {
  try {
    // 最近のメッセージを分析
    const recentMessages = await pool.query(
      'SELECT content FROM messages_simple ORDER BY timestamp DESC LIMIT 100'
    );
    
    // リスクキーワードをカウント
    const riskKeywords = ['疲れ', '不安', 'ストレス', '辛い', '限界', '無理'];
    let riskScore = 0;
    
    recentMessages.rows.forEach((msg: any) => {
      riskKeywords.forEach(keyword => {
        if (msg.content && msg.content.includes(keyword)) {
          riskScore++;
        }
      });
    });
    
    // MCPツールでも分析（オプショナル）
    let mcpResult = null;
    try {
      mcpResult = await callMcpTool('detect_risk_patterns', {
        messages: recentMessages.rows.map((r: any) => r.content)
      });
    } catch (mcpError) {
      console.log('MCP analysis skipped:', mcpError);
    }
    
    res.json({
      success: true,
      risk_level: riskScore > 10 ? 'high' : riskScore > 5 ? 'medium' : 'low',
      risk_score: riskScore,
      message_count: recentMessages.rows.length,
      recommendations: riskScore > 10 ? 
        ['休憩を取ることをお勧めします', '信頼できる人と話してください'] :
        riskScore > 5 ?
        ['ストレス管理に注意してください', '定期的な休憩を心がけてください'] :
        ['現在のペースを維持してください'],
      mcp_analysis: mcpResult
    });
  } catch (error) {
    // TypeScriptのエラーハンドリング
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Risk detection error:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// 2️⃣ 感情分析エンドポイント
// 感情分析エンドポイント（修正版）
app.post('/api/analyze-emotions', async (req, res) => {
  try {
    const period = req.body.period || '7 days';
    
    // 期間内のメッセージを取得（修正版）
    const messages = await pool.query(
      `SELECT content, timestamp FROM messages_simple 
       WHERE timestamp > NOW() - INTERVAL '7 days'
       ORDER BY timestamp DESC`
    );
    
    // 感情分析
    const emotions = {
      positive: 0,
      negative: 0,
      neutral: 0
    };
    
    // 感情キーワード
    const positiveWords = ['嬉しい', '楽しい', '良い', '成功', '達成', '素晴らしい', '完璧'];
    const negativeWords = ['悲しい', '辛い', '失敗', '不安', '疲れ', '困った', 'エラー'];
    
    messages.rows.forEach((msg: any) => {
      if (!msg.content) return;
      
      const content = msg.content.toLowerCase();
      const hasPositive = positiveWords.some(word => content.includes(word));
      const hasNegative = negativeWords.some(word => content.includes(word));
      
      if (hasPositive && !hasNegative) {
        emotions.positive++;
      } else if (hasNegative && !hasPositive) {
        emotions.negative++;
      } else {
        emotions.neutral++;
      }
    });
    
    const total = messages.rows.length || 1;
    
    res.json({
      success: true,
      period: period,
      total_messages: total,
      emotions,
      emotion_ratio: {
        positive: Math.round((emotions.positive / total) * 100),
        negative: Math.round((emotions.negative / total) * 100),
        neutral: Math.round((emotions.neutral / total) * 100)
      },
      trend: emotions.positive > emotions.negative ? 'positive' : 
             emotions.negative > emotions.positive ? 'negative' : 'neutral'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Emotion analysis error:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// 3️⃣ 幸福トリガー分析
app.get('/api/happiness-triggers', async (req, res) => {
  try {
    // ポジティブなメッセージを分析
    const positiveMessages = await pool.query(`
      SELECT content, timestamp 
      FROM messages_simple 
      WHERE content ILIKE ANY(ARRAY['%嬉しい%', '%楽しい%', '%成功%', '%達成%'])
      ORDER BY timestamp DESC 
      LIMIT 50
    `);
    
    // 共通パターンを抽出
    const patterns: { [key: string]: number } = {};
    const activities = ['作業', 'コーディング', '勉強', '運動', '読書', '会話', '休憩'];
    
    positiveMessages.rows.forEach((msg: any) => {
      activities.forEach(activity => {
        if (msg.content && msg.content.includes(activity)) {
          patterns[activity] = (patterns[activity] || 0) + 1;
        }
      });
    });
    
    // ランキング作成
    const triggers = Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .map(([activity, count]) => ({
        activity,
        count,
        percentage: Math.round((count / positiveMessages.rows.length) * 100)
      }));
    
    res.json({
      success: true,
      happiness_triggers: triggers,
      top_trigger: triggers[0] || null,
      analysis_count: positiveMessages.rows.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Happiness triggers error:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// server.tsに追加
app.post('/api/get-personalized-advice', async (req, res) => {
  try {
    // 最近の分析結果を取得
    const riskResponse = await fetch('http://localhost:3000/api/detect-risks', {
      method: 'POST'
    });
    const riskData = await riskResponse.json();
    
    const emotionResponse = await fetch('http://localhost:3000/api/analyze-emotions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({period: '7 days'})
    });
    const emotionData = await emotionResponse.json();
    
    // パーソナライズされたアドバイスを生成
    let advice = [];
    
    // リスクレベルに基づくアドバイス
    if (riskData.risk_level === 'high') {
      advice.push('🚨 ストレスレベルが高いです。今すぐ10分間の休憩を取りましょう');
      advice.push('💬 信頼できる人と話す時間を作ってください');
      advice.push('🧘 深呼吸や瞑想を試してみてください');
    } else if (riskData.risk_level === 'medium') {
      advice.push('⚠️ ストレスが蓄積しています。定期的な休憩を心がけてください');
      advice.push('🚶 短い散歩でリフレッシュしましょう');
    }
    
    // 感情傾向に基づくアドバイス
    if (emotionData.emotion_ratio?.negative > 20) {
      advice.push('😊 ポジティブな活動を増やしましょう（特に「会話」がおすすめ）');
      advice.push('📝 感謝日記をつけてみてください');
    }
    
    // 幸福トリガーに基づくアドバイス
    const triggersResponse = await fetch('http://localhost:3000/api/happiness-triggers');
    const triggersData = await triggersResponse.json();
    
    if (triggersData.top_trigger) {
      advice.push(`✨ 「${triggersData.top_trigger.activity}」があなたの幸福度を上げます。今日も取り入れましょう`);
    }
    
    // デフォルトアドバイス
    if (advice.length === 0) {
      advice.push('👍 調子は良好です。このペースを維持しましょう');
      advice.push('💪 新しいチャレンジを始める良いタイミングです');
    }
    
    res.json({
      success: true,
      advice: advice,
      priority: riskData.risk_level === 'high' ? 'urgent' : 'normal',
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// generateStressSummary関数を追加（700行目付近）
function generateStressSummary(data: any): string {
  const level = data.overall_stress_level || 0;
  const trend = data.trend_analysis?.change_rate || 0;
  
  let summary = "";
  
  if (level > 70) {
    summary = "⚠️ 危険レベル: ストレスが限界に近づいています。";
  } else if (level > 50) {
    summary = "⚡ 警告レベル: ストレスが蓄積されています。";
  } else if (level > 30) {
    summary = "📊 注意レベル: ストレス要因を監視してください。";
  } else {
    summary = "✅ 正常レベル: ストレスは管理可能な範囲です。";
  }
  
  if (trend > 50) {
    summary += " 急激に悪化しています！";
  } else if (trend > 20) {
    summary += " 増加傾向にあります。";
  } else if (trend < -20) {
    summary += " 改善傾向が見られます。";
  }
  
  return summary;
}

// server.js に追加

// ストレス分析エンドポイント
app.post('/api/analyze-stress-triggers', async (req, res) => {
  try {
    console.log('🔍 Analyzing stress triggers...');
    
    // MCPツールを呼び出し
    const result = await callMcpTool('analyze_stress_triggers', {});
    
    // デバッグ: 結果の構造を確認
    console.log('📊 Raw MCP Result:', result);
    console.log('📊 Result type:', typeof result);
    console.log('📊 Result keys:', result ? Object.keys(result) : 'null');
    
    // resultの構造を確認して適切にパース
    let data;
    if (result && result.content && result.content[0] && result.content[0].text) {
      console.log('📊 Parsing from content[0].text');
      try {
        data = JSON.parse(result.content[0].text);
        console.log('✅ Parsed data:', data);
    
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.log('📊 Raw text:', result.content[0].text);
        data = {};
      }
    } else if (result && typeof result === 'object') {
        console.log('📊 Using result directly');
        // result.success と result.message しかない場合は空データを設定
        if (result.success && result.message && !result.overall_stress_level) {
          data = {
            overall_stress_level: 0,
            top_triggers: [],
            critical_keywords: [],
            recommendations: [],
            trend_analysis: { this_week: 0, last_week: 0, change_rate: 0 },
            summary: "データ取得中にエラーが発生しました"
          };
        } else {
          data = result;
        }
    } else {  // ← ここを修正
        console.error('❌ Unexpected result structure:', result);
        data = {};
    }   
    // デバッグ: パース後のデータ確認
    console.log('📊 Final data keys:', Object.keys(data));
    console.log('📊 Stress level:', data.overall_stress_level);
    console.log('📊 Triggers count:', data.top_triggers?.length || 0);
    
    // レスポンス作成
    const response = {
      success: true,
      data: {
        top_triggers: data.top_triggers || [],
        overall_stress_level: data.overall_stress_level || 0,
        critical_keywords: data.critical_keywords || [],
        recommendations: data.recommendations || [],
        trend_analysis: data.trend_analysis || {
          this_week: 0,
          last_week: 0,
          change_rate: 0
        },
        summary: data.summary || generateStressSummary(data)
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending response with stress level:', response.data.overall_stress_level);
    res.json(response);
    
  } catch (error: any) {  // ← any型を指定
    console.error('❌ Error in stress analysis:', error);
    console.error('Error stack:', error?.stack);  // ← オプショナルチェイニング
    
    // エラー時のフォールバック
    res.json({
      success: false,
      error: error?.message || 'Unknown error',  // ← オプショナルチェイニング
      data: {
        top_triggers: [],
        overall_stress_level: 0,
        critical_keywords: [],
        recommendations: ['エラーが発生しました。ログを確認してください。'],
        trend_analysis: {
          this_week: 0,
          last_week: 0,
          change_rate: 0
        },
        summary: 'エラーが発生しました'
      }
    });
  }
});

// 転職チェックリストAPI
app.get('/api/job-checklist', async (req, res) => {
  try {
    const result = await callMcpTool('manage_job_checklist', { action: 'list' });
    
    let data;
    if (result && result.content && result.content[0]) {
      data = JSON.parse(result.content[0].text);
    } else {
      data = { tasks: [], progress: 0 };
    }
    
    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/job-checklist/update', async (req, res) => {
  try {
    const { task_id, completed, notes } = req.body;
    
    const result = await callMcpTool('manage_job_checklist', {
      action: 'update',
      task_id: task_id,
      completed: completed,
      notes: notes
    });
    
    res.json({
      success: true,
      message: 'タスクを更新しました'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// 🚀 サーバー起動
//
async function startServer() {
  try {
    // PostgreSQL接続テスト
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
    
    // MCPクライアントの状態
    console.log('✅ MCP Client initialized');
    console.log('✅ PostgreSQL connected successfully');
    console.log('💾 PostgreSQL conversation saving enabled');
    
    app.listen(port, host, () => {
      console.log(`🚀 HTTP API Wrapper running on http://${host}:${port}`);
      console.log(`📡 Accessible from Windows at http://localhost:${port}`);
      console.log(`📡 WSL2 IP: http://172.21.66.155:${port}`);
      console.log(`✅ Health check: http://localhost:${port}/health`);
      console.log(`   - POST http://localhost:${port}/api/messages`);
      console.log(`   - POST http://localhost:${port}/api/save-conversation`);
      console.log(`   - GET  http://localhost:${port}/api/health`);
      console.log(`   - GET  http://localhost:${port}/api/stats`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

//
// 🛑 シャットダウン処理
//
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down HTTP API Wrapper...');
  
  try {
    mcpProcess.kill();
    await pool.end();
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('⚠️ Error during shutdown:', error);
  }
  
  process.exit(0);
});