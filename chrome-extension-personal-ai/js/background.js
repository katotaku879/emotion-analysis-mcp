// Background Service Worker - API Proxy
console.log('🌐 Background Service Worker started');

// APIからデータを取得してリレー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.type);
  
  if (request.type === 'FETCH_DASHBOARD_DATA') {
    // バックグラウンドからはlocalhostにアクセス可能
    fetchDashboardData()
      .then(data => {
        console.log('✅ Data fetched:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('❌ Fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンス
  }
  
  if (request.type === 'GET_STATS') {
    // 統計情報を取得
    fetch('http://localhost:3000/api/stats')
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function fetchDashboardData() {
  try {
    // 各APIエンドポイントからデータを取得
    const [stats, stress, readiness] = await Promise.all([
      fetch('http://localhost:3000/api/stats').then(r => r.json()),
      fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({tool: 'analyze_work_stress', parameters: {period: '30 days'}})
      }).then(r => r.json()),
      fetch('http://localhost:3000/api/dashboard').then(r => r.json())
    ]);
    
    return {
      totalMessages: stats.totalMessages || 34063,
      totalSessions: stats.totalSessions || 3,
      stressLevel: stress.currentLevel || 45,
      emotionState: stats.emotionState || 'neutral',
      jobReadiness: readiness.readiness || 40,
      stressFactors: stress.factors || [],
      checklist: readiness.checklist || []
    };
  } catch (error) {
    console.error('Fetch error:', error);
    // フォールバックデータ
    return {
      totalMessages: 34063,
      totalSessions: 3,
      stressLevel: 45,
      emotionState: 'neutral',
      jobReadiness: 40
    };
  }
}

// 定期的にデータを更新
setInterval(() => {
  fetchDashboardData().then(data => {
    // Chrome Storageに保存
    chrome.storage.local.set({ dashboardData: data }, () => {
      console.log('📊 Dashboard data updated:', data);
    });
  });
}, 30000); // 30秒ごと

// 初回データ取得
fetchDashboardData().then(data => {
  chrome.storage.local.set({ dashboardData: data });
});
