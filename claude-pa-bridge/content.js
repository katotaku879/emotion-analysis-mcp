console.log('🔌 Claude PA Bridge: Content script loaded');

// データを定期的にページに注入
function injectData() {
  chrome.storage.local.get(['dashboardData'], (result) => {
    if (result.dashboardData) {
      // グローバル変数として公開
      window.claudePAData = result.dashboardData;
      
      // カスタムイベントを発火
      window.dispatchEvent(new CustomEvent('claudePADataUpdate', {
        detail: result.dashboardData
      }));
      
      console.log('💉 Data injected into page:', result.dashboardData);
    }
  });
}

// 初回注入
setTimeout(injectData, 1000);

// 定期的に注入
setInterval(injectData, 10000);

// Storageの変更を監視
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.dashboardData) {
    injectData();
  }
});
