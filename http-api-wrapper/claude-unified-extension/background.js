console.log('🚀 Claude AI Auto Save - Background Service');

// メッセージリスナー（保存処理）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_NOW') {
    console.log('💾 Saving messages...');
    
    fetch('http://localhost:3000/api/conversations/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ messages: request.messages || [] })
    })
    .then(response => response.json())
    .then(result => {
      console.log('✅ Saved:', result);
      sendResponse({ success: true, result });
    })
    .catch(error => {
      console.error('❌ Error:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true;
  }
});

// 自動注入関数
async function injectAutoSave(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'ISOLATED',
      func: function() {
        // 既に注入済みかチェック
        if (window.CLAUDE_AUTO_SAVE_INJECTED) {
          console.log('Already injected');
          return;
        }
        
        window.CLAUDE_AUTO_SAVE_INJECTED = true;
        console.log('🎯 Auto Save Injected at', new Date().toLocaleTimeString());
        
        // メッセージを収集する関数
        function collectMessages() {
          const messages = [];
          const elements = document.querySelectorAll('div, p, span');
          
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 50 && text.length < 5000) {
              // UIテキストを除外
              if (!text.includes('Claude') && !text.includes('Opus')) {
                messages.push({
                  content: text.substring(0, 1000),
                  role: 'user',
                  timestamp: new Date().toISOString()
                });
              }
            }
          });
          
          return messages.slice(0, 10); // 最大10件
        }
        
        // 保存を実行
        function saveMessages() {
          const messages = collectMessages();
          
          if (messages.length > 0) {
            console.log(`📝 Saving ${messages.length} messages...`);
            
            chrome.runtime.sendMessage({
              type: 'SAVE_NOW',
              messages: messages
            }, response => {
              if (response?.success) {
                console.log('✅ Auto saved:', response.result);
              }
            });
          }
        }
        
        // DOM変更を監視
        const observer = new MutationObserver(() => {
          // 変更があったら保存を予約
          if (!window.saveScheduled) {
            window.saveScheduled = true;
            setTimeout(() => {
              saveMessages();
              window.saveScheduled = false;
            }, 10000); // 10秒後に保存
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // 定期保存（5分ごと）
        setInterval(saveMessages, 300000);
        
        // 初回保存
        setTimeout(saveMessages, 5000);
        
        console.log('✅ Auto save system active');
      }
    });
    
    console.log('✅ Injected to tab', tabId);
  } catch (error) {
    console.error('Injection error:', error);
  }
}

// タブが更新されたら自動注入
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('claude.ai')) {
    console.log('Claude.ai tab loaded:', tabId);
    injectAutoSave(tabId);
  }
});

// 拡張機能が起動した時、既存のClaude.aiタブに注入
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({url: 'https://claude.ai/*'}, (tabs) => {
    tabs.forEach(tab => {
      console.log('Found existing Claude.ai tab:', tab.id);
      injectAutoSave(tab.id);
    });
  });
});

// ブラウザ起動時にも実行
chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.query({url: 'https://claude.ai/*'}, (tabs) => {
    tabs.forEach(tab => {
      injectAutoSave(tab.id);
    });
  });
});

console.log('✅ Background service ready');

// 自動分析結果を定期取得
async function fetchAutoAnalysis() {
  try {
    const response = await fetch('http://localhost:3000/api/auto-analysis');
    const analysis = await response.json();
    
    // 危険レベルの場合、通知
    if (analysis.stressAnalysis?.level > 80) {
      chrome.notifications.create({
        type: 'alert',
        iconUrl: 'icon128.png',
        title: '⚠️ 高ストレス警告',
        message: 'ストレスレベルが危険域に達しています。休息を取ってください。'
      });
    }
    
    if (analysis.jobUrgency?.urgency > 80) {
      chrome.notifications.create({
        type: 'alert',
        iconUrl: 'icon128.png',
        title: '💼 転職推奨',
        message: '転職緊急度が高いです。転職活動を開始することを推奨します。'
      });
    }
    
    // ストレージに保存（ポップアップで表示用）
    chrome.storage.local.set({ autoAnalysis: analysis });
    
  } catch (error) {
    console.error('自動分析取得エラー:', error);
  }
}

// 5分ごとに取得
setInterval(fetchAutoAnalysis, 300000);

// 初回取得
fetchAutoAnalysis();
