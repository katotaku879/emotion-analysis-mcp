// タブ切り替え
window.switchTab = function(evt, tabName) {
  // すべてのタブとコンテンツを非アクティブに
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  // クリックされたタブをアクティブに
  evt.currentTarget.classList.add('active');
  // 対応するコンテンツを表示
  document.getElementById(tabName).classList.add('active');
}

// グローバルに公開
window.switchTab = switchTab;

document.addEventListener('DOMContentLoaded', async () => {

  document.getElementById('tab-general').addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-general').classList.add('active');
    document.getElementById('general').classList.add('active');
  });
  
  document.getElementById('tab-stress').addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-stress').classList.add('active');
    document.getElementById('stress').classList.add('active');
  });
  
  document.getElementById('tab-career').addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-career').classList.add('active');
    document.getElementById('career').classList.add('active');
  });
  // データを更新
  async function updateStats() {
    try {
      // ダッシュボードデータを取得（自動分析含む）
      const dashboardResponse = await fetch('http://localhost:3000/api/dashboard');
      const dashboardData = await dashboardResponse.json();
      
      // PAサーバーからも取得
      const paResponse = await fetch('http://localhost:3333/api/pa/stats');
      const paData = await paResponse.json();
      
      // === 一般タブ ===
      if (document.getElementById('totalMessages')) {
        document.getElementById('totalMessages').textContent = dashboardData.totalMessages || '0';
      }
      if (document.getElementById('sessionCount')) {
        document.getElementById('sessionCount').textContent = dashboardData.totalSessions || '0';
      }
      if (document.getElementById('lastSave')) {
        const lastSave = new Date(dashboardData.lastUpdate || Date.now());
        document.getElementById('lastSave').textContent = lastSave.toLocaleTimeString('ja-JP');
      }
      
      // === ストレスタブ ===
      if (document.getElementById('stressLevel')) {
        const stressLevel = dashboardData.stressLevel || 0;
        document.getElementById('stressLevel').textContent = `${stressLevel}%`;
        document.getElementById('stressFill').style.width = `${stressLevel}%`;
        
        // ストレスレベルに応じて色を変更
        const stressFill = document.getElementById('stressFill');
        if (stressLevel > 80) {
          stressFill.style.background = '#f44336'; // 赤
        } else if (stressLevel > 60) {
          stressFill.style.background = '#ff9800'; // オレンジ
        } else if (stressLevel > 40) {
          stressFill.style.background = '#ffeb3b'; // 黄色
        } else {
          stressFill.style.background = '#4caf50'; // 緑
        }
      }
      
      if (document.getElementById('stressCause')) {
        document.getElementById('stressCause').textContent = paData.mainStressor || '分析中';
      }
      if (document.getElementById('stressAdvice')) {
        document.getElementById('stressAdvice').textContent = 
          dashboardData.recommendations ? dashboardData.recommendations[0] : '休息を取る';
      }
      
      // === 転職タブ ===
      if (document.getElementById('jobUrgency')) {
        const urgency = dashboardData.jobUrgency || 0;
        document.getElementById('jobUrgency').textContent = `${urgency}%`;
        document.getElementById('urgencyFill').style.width = `${urgency}%`;
        
        // 緊急度に応じて色を変更
        const urgencyFill = document.getElementById('urgencyFill');
        if (urgency > 80) {
          urgencyFill.style.background = '#f44336'; // 赤
        } else if (urgency > 60) {
          urgencyFill.style.background = '#ff9800'; // オレンジ
        } else if (urgency > 40) {
          urgencyFill.style.background = '#ffeb3b'; // 黄色
        } else {
          urgencyFill.style.background = '#4caf50'; // 緑
        }
      }
      
      if (document.getElementById('jobReadiness')) {
        document.getElementById('jobReadiness').textContent = `${paData.jobReadiness || 40}%`;
      }
      if (document.getElementById('careerAdvice')) {
        document.getElementById('careerAdvice').textContent = 
          dashboardData.recommendations ? dashboardData.recommendations[2] : '準備を進める';
      }
      
      // 最終更新時刻
      if (document.getElementById('lastUpdate')) {
        document.getElementById('lastUpdate').textContent = 
          `最終更新: ${new Date().toLocaleTimeString('ja-JP')}`;
      }
        
    } catch (error) {
      console.error('Stats error:', error);
    }
  }
  
  // ボタンイベント
  document.getElementById('saveNow')?.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        world: 'ISOLATED',
        func: () => {
          chrome.runtime.sendMessage({
            type: 'SAVE_NOW',
            messages: [{
              content: 'Manual save from popup',
              role: 'user',
              timestamp: new Date().toISOString()
            }]
          });
        }
      });
    });
    setTimeout(updateStats, 1000);
  });
  
  document.getElementById('syncData')?.addEventListener('click', async () => {
    await updateStats();
    alert('データを同期しました');
  });
  
  document.getElementById('analyzeStress')?.addEventListener('click', async () => {
    await fetch('http://localhost:3000/api/analyze-now', { method: 'POST' });
    setTimeout(updateStats, 1000);
  });
  
  document.getElementById('analyzeCareer')?.addEventListener('click', async () => {
    await fetch('http://localhost:3000/api/analyze-now', { method: 'POST' });
    setTimeout(updateStats, 1000);
  });
  
  // 初期読み込み
  updateStats();
  
  // 3秒ごとに更新
  setInterval(updateStats, 3000);
});

