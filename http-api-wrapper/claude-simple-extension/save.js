// Claude Auto Save Extension
(function() {
  'use strict';
  
  // 即座にログを出力
  console.log('%c🚀 SAVE.JS LOADED!', 'background: #4CAF50; color: white; padding: 5px; font-size: 16px;');
  
  // グローバル変数として公開
  window.SAVE_JS_LOADED = true;
  window.SAVE_JS_VERSION = '3.0.0';
  
  // API設定
  const API_URL = 'http://localhost:3000/api/conversations/save';
  
  // テスト関数
  window.testSaveFunction = async function() {
    console.log('📝 Test save function called');
    
    const testMessage = {
      content: 'Test message from save.js v3',
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [testMessage]
        })
      });
      
      const result = await response.json();
      console.log('✅ Test save result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Test save error:', error);
      return error;
    }
  };
  
  // 自動保存機能
  let messageQueue = [];
  let processedMessages = new Set();
  
  function captureMessages() {
    const messages = document.querySelectorAll('.prose, [data-testid*="message"]');
    
    messages.forEach(msg => {
      const content = msg.textContent?.trim();
      if (content && content.length > 10) {
        const hash = content.substring(0, 50);
        
        if (!processedMessages.has(hash)) {
          processedMessages.add(hash);
          messageQueue.push({
            content: content,
            role: 'user',
            timestamp: new Date().toISOString()
          });
          console.log('📝 Message captured');
        }
      }
    });
    
    // 5メッセージごとに保存
    if (messageQueue.length >= 5) {
      saveMessages();
    }
  }
  
  async function saveMessages() {
    if (messageQueue.length === 0) return;
    
    console.log(`💾 Saving ${messageQueue.length} messages...`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ messages: messageQueue })
      });
      
      const result = await response.json();
      console.log('✅ Saved:', result);
      messageQueue = [];
      
    } catch (error) {
      console.error('❌ Save error:', error);
    }
  }
  
  // 5秒ごとにチェック
  setInterval(captureMessages, 5000);
  
  // 30秒ごとに強制保存
  setInterval(saveMessages, 30000);
  
  console.log('✅ Auto save initialized');
  console.log('📝 Test with: window.testSaveFunction()');
  
})();
