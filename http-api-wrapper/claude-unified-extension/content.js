console.log('🚀 Claude AI Complete Suite - Content Script Loaded');
console.log('📍 URL:', window.location.href);
console.log('⏰ Time:', new Date().toLocaleTimeString());

// 設定
const CONFIG = {
  saveInterval: 300000, // 5分
  saveUrl: 'http://localhost:3000/api/conversations/save',
  paUrl: 'http://localhost:3333/api/pa'
};

// メッセージバッファ
let messageBuffer = [];
let processedMessages = new Set();

// メッセージを抽出する関数
function extractMessages() {
  const messages = [];
  
  // 複数のセレクタを試す
  const selectors = [
    '[data-testid*="conversation-turn"]',
    '[data-testid*="message"]',
    '.prose',
    'div[class*="text-base"]',
    'div[class*="whitespace-pre-wrap"]'
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => {
      const content = element.textContent?.trim();
      const messageId = content?.substring(0, 50);
      
      if (content && content.length > 20 && !processedMessages.has(messageId)) {
        processedMessages.add(messageId);
        
        // roleを判定
        let role = 'user';
        if (element.closest('[data-testid*="assistant"]') || 
            element.innerHTML?.includes('Claude')) {
          role = 'assistant';
        }
        
        messages.push({
          content: content,
          role: role,
          timestamp: new Date().toISOString()
        });
        
        console.log(`📝 Captured ${role}:`, content.substring(0, 30) + '...');
      }
    });
  });
  
  return messages;
}

// メッセージを保存
async function saveMessages() {
  const messages = extractMessages();
  
  if (messages.length === 0) {
    console.log('⚠️ No new messages to save');
    return;
  }
  
  console.log(`💾 Saving ${messages.length} messages...`);
  
  try {
    const response = await fetch(CONFIG.saveUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ messages })
    });
    
    const result = await response.json();
    console.log('✅ Saved:', result);
    
    // LocalStorageに統計を保存
    const stats = JSON.parse(localStorage.getItem('claudeStats') || '{}');
    stats.lastSave = new Date().toISOString();
    stats.totalSaved = (stats.totalSaved || 0) + result.saved;
    localStorage.setItem('claudeStats', JSON.stringify(stats));
    
    return result;
  } catch (error) {
    console.error('❌ Save error:', error);
    
    // background scriptを通じて保存を試みる
    chrome.runtime.sendMessage({
      type: 'SAVE_MESSAGES',
      messages: messages
    }, response => {
      console.log('Background save response:', response);
    });
  }
}

// DOM監視
const observer = new MutationObserver(() => {
  const newMessages = extractMessages();
  if (newMessages.length > 0) {
    messageBuffer.push(...newMessages);
    console.log(`📦 Buffer size: ${messageBuffer.length}`);
    
    // 5メッセージごとに保存
    if (messageBuffer.length >= 5) {
      saveMessages();
      messageBuffer = [];
    }
  }
});

// 監視開始
function startWatching() {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  console.log('👀 Watching for messages...');
}

// 定期保存
setInterval(() => {
  if (messageBuffer.length > 0) {
    saveMessages();
    messageBuffer = [];
  }
}, CONFIG.saveInterval);

// グローバル関数を公開
window.claudeAutoSave = {
  enabled: true,
  saveNow: saveMessages,
  getStats: () => JSON.parse(localStorage.getItem('claudeStats') || '{}'),
  extractMessages: extractMessages
};

// 初期化
setTimeout(startWatching, 3000);

console.log('✅ Auto-save initialized');
console.log('💡 Manual save: window.claudeAutoSave.saveNow()');
console.log('📊 Stats: window.claudeAutoSave.getStats()');
