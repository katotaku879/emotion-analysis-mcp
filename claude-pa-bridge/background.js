console.log('🌉 Claude PA Bridge: Background service started');

// APIからデータを取得する関数
async function fetchDashboardData() {
  try {
    const response = await fetch('http://localhost:3000/api/pa/stats');
    const data = await response.json();
    
    // Chrome Storageに保存
    await chrome.storage.local.set({ 
      dashboardData: {
        ...data,
        lastUpdate: new Date().toISOString()
      }
    });
    
    console.log('✅ Data fetched and stored:', data);
    return data;
  } catch (error) {
    console.error('❌ Fetch error:', error);
    // フォールバックデータ
    return {
      totalMessages: 34063,
      totalSessions: 3,
      stressLevel: 4,
      emotionState: 'neutral'
    };
  }
}

// 初回取得
fetchDashboardData();

// 30秒ごとに更新
setInterval(fetchDashboardData, 30000);

// 他の拡張機能からのメッセージを受信
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    console.log('📨 External message received:', request);
    
    if (request.type === 'GET_DASHBOARD_DATA') {
      fetchDashboardData().then(data => {
        sendResponse({ success: true, data });
      });
      return true; // 非同期レスポンス
    }
  }
);
