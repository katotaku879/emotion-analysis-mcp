// mcp-server/src/filters.js

const systemPatterns = [
  // WSLコマンド
  /^cd\s+/,
  /^ls\s+/,
  /^cat\s+/,
  /^echo\s+/,
  /^npm\s+/,
  /^node\s+/,
  /^sudo\s+/,
  /^psql\s+/,
  /^curl\s+/,
  /^wget\s+/,
  /^npx\s+/,
  /^yarn\s+/,
  
  // コードブロック
  /^```[\s\S]*```$/m,
  /^\`\`\`/,
  
  // ファイルパス
  /^\/\w+/,
  /^~\//,
  /^C:\\/i,
  /^\.\//,
  
  // 技術的な設定
  /^CREATE TABLE/i,
  /^SELECT.*FROM/i,
  /^INSERT INTO/i,
  /^UPDATE.*SET/i,
  /^DELETE FROM/i,
  /^ALTER TABLE/i,
  
  // JSON/設定
  /^\{[\s\S]*\}$/,
  /^\[[\s\S]*\]$/
];

const technicalKeywords = [
  'localhost',
  'postgresql',
  'npm install',
  'git clone',
  'git push',
  'git pull',
  'api',
  'http',
  'sql',
  'json',
  'function',
  'const',
  'let',
  'var',
  'import',
  'export',
  'require',
  'module.exports',
  'async',
  'await',
  'promise',
  'callback',
  'typescript',
  'javascript',
  'wsl',
  'ubuntu',
  'windows'
];

const emotionalKeywords = [
  // ポジティブ
  '嬉しい', '楽しい', '幸せ', '良い', '素晴らしい',
  '面白い', '興味深い', 'ありがとう', '感謝', '好き',
  '愛', '最高', 'やった', '成功', '達成',
  
  // ネガティブ
  '悲しい', '辛い', '苦しい', '不安', '心配',
  '疲れ', 'ストレス', '困った', '難しい', '嫌',
  '怖い', '恐怖', '最悪', '失敗', 'ダメ',
  
  // 仕事関連
  '夜勤', '残業', '休み', '仕事', '職場',
  'トラブル', '上司', '同僚', 'ピリピリ', '会議',
  '締切', 'デッドライン', 'プレッシャー', '責任',
  
  // 生活
  '眠い', '起きた', '食事', '運動', '体調',
  '健康', '病気', '頭痛', '睡眠', '休憩',
  '朝', '夜', '昼', '週末', '平日',
  
  // 転職関連
  '転職', '退職', '辞める', '面接', '履歴書',
  'キャリア', 'スキル', '年収', '給料', '評価'
];

function isSystemMessage(content) {
  if (!content || typeof content !== 'string') return false;
  
  const trimmedContent = content.trim();
  
  // コマンドパターンチェック
  for (const pattern of systemPatterns) {
    if (pattern.test(trimmedContent)) {
      return true;
    }
  }
  
  // 技術キーワードの密度チェック
  const words = content.toLowerCase().split(/\s+/);
  if (words.length === 0) return false;
  
  let technicalCount = 0;
  
  for (const word of words) {
    if (technicalKeywords.some(keyword => 
      word.includes(keyword.toLowerCase())
    )) {
      technicalCount++;
    }
  }
  
  // 30%以上が技術用語なら除外
  const technicalDensity = technicalCount / words.length;
  return technicalDensity > 0.3;
}

function isEmotionalContent(content) {
  if (!content || typeof content !== 'string') return false;
  
  const lowerContent = content.toLowerCase();
  
  // 日本語の感情表現を優先的にチェック
  const hasJapaneseEmotion = emotionalKeywords.some(keyword => 
    content.includes(keyword)
  );
  
  if (hasJapaneseEmotion) return true;
  
  // 英語の感情表現もチェック
  const englishEmotions = [
    'happy', 'sad', 'angry', 'tired', 'stressed',
    'worried', 'excited', 'nervous', 'afraid', 'love'
  ];
  
  return englishEmotions.some(emotion => 
    lowerContent.includes(emotion)
  );
}

function calculateEmotionScore(content) {
  if (!content) return 0;
  
  let score = 0;
  const lowerContent = content.toLowerCase();
  
  // ポジティブキーワード
  const positiveWords = ['嬉しい', '楽しい', '幸せ', '良い', '素晴らしい', 
                         '最高', 'やった', '成功', '達成', 'ありがとう'];
  const negativeWords = ['悲しい', '辛い', '苦しい', '不安', '心配',
                        '疲れ', 'ストレス', '最悪', '失敗', '限界'];
  
  positiveWords.forEach(word => {
    if (content.includes(word)) score += 2;
  });
  
  negativeWords.forEach(word => {
    if (content.includes(word)) score -= 2;
  });
  
  // -10 から +10 の範囲に正規化
  return Math.max(-10, Math.min(10, score));
}

export default {
  isSystemMessage,
  isEmotionalContent,
  calculateEmotionScore,
  
  filterConversations: function(messages) {
    return messages.filter(msg => {
      // システムメッセージを除外
      if (isSystemMessage(msg.content)) {
        return false;
      }
      
      // 短すぎるメッセージを除外（10文字未満）
      if (msg.content && msg.content.length < 10) {
        return false;
      }
      
      // Assistantの定型応答を除外
      if (msg.role === 'assistant') {
        const startPatterns = [
          '実装を開始します',
          'エラーを確認します',
          'コードを作成します',
          '以下の手順で',
          'コマンドを実行',
          '```'
        ];
        
        if (startPatterns.some(pattern => 
          msg.content && msg.content.startsWith(pattern)
        )) {
          return false;
        }
      }
      
      return true;
    });
  },
  
  extractEmotionalMessages: function(messages) {
    return messages.filter(msg => 
      isEmotionalContent(msg.content)
    );
  },
  
  analyzeEmotionalTrends: function(messages) {
    const emotionalMessages = this.extractEmotionalMessages(messages);
    
    const trends = {
      total: emotionalMessages.length,
      positive: 0,
      negative: 0,
      neutral: 0,
      byDate: {},
      topEmotions: {},
      averageScore: 0
    };
    
    let totalScore = 0;
    
    emotionalMessages.forEach(msg => {
      const score = calculateEmotionScore(msg.content);
      totalScore += score;
      
      if (score > 2) trends.positive++;
      else if (score < -2) trends.negative++;
      else trends.neutral++;
      
      // 日付別集計
      const date = new Date(msg.created_at).toISOString().split('T')[0];
      if (!trends.byDate[date]) {
        trends.byDate[date] = { positive: 0, negative: 0, neutral: 0 };
      }
      
      if (score > 2) trends.byDate[date].positive++;
      else if (score < -2) trends.byDate[date].negative++;
      else trends.byDate[date].neutral++;
    });
    
    trends.averageScore = emotionalMessages.length > 0 
      ? (totalScore / emotionalMessages.length).toFixed(2)
      : 0;
    
    return trends;
  }
};