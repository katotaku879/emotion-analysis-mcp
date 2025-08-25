// タブ切り替え
window.switchTab = function(evt, tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  evt.currentTarget.classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

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

  async function updateStats() {
    console.log('updateStats開始');
    try {
      // ダッシュボードデータ取得
      const dashboardResponse = await fetch('http://localhost:3000/api/dashboard');
      const dashboardData = await dashboardResponse.json();
      
      // 感情分析を取得
      const emotionResponse = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'analyze_emotions',
          parameters: {
            period: '7 days',
            includeSystemMessages: false
          }
        })
      });
      const emotionData = await emotionResponse.json();
      console.log('Emotion data:', emotionData);

      // ストレス分析専用API呼び出し
      const stressResponse = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'analyze_stress_triggers',
          parameters: { timeframe: 7 }
        })
      });
      const stressAnalysis = await stressResponse.json();
      console.log('Stress analysis:', stressAnalysis);

      // ストレスレベル表示
      if (document.getElementById('stressLevel')) {
        let actualStressLevel = 0;
        let trend = '';
        
        if (stressAnalysis.success && stressAnalysis.result) {
          actualStressLevel = stressAnalysis.result.overall_stress_level || 0;
          
          const trendData = stressAnalysis.result.trend_analysis;
          if (trendData && trendData.change_rate > 20) {
            trend = '↑';
          } else if (trendData && trendData.change_rate < -20) {
            trend = '↓';
          }
        }
        
        console.log('Stress level:', actualStressLevel);
        document.getElementById('stressLevel').textContent = `${actualStressLevel}% ${trend}`;
        document.getElementById('stressFill').style.width = `${actualStressLevel}%`;
        
        const stressFill = document.getElementById('stressFill');
        if (actualStressLevel > 70) {
          stressFill.style.background = '#f44336';
        } else if (actualStressLevel > 40) {
          stressFill.style.background = '#ff9800';
        } else {
          stressFill.style.background = '#4caf50';
        }
      }
      
      // PAサーバー取得
      try {
        const paResponse = await fetch('http://localhost:3334/api/pa/stats');
        const paData = await paResponse.json();
      } catch (e) {
        console.log('PA server not available');
      }

      // 一般タブ
      if (document.getElementById('totalMessages')) {
        const countResponse = await fetch('http://localhost:3000/api/messages/count');
        const countData = await countResponse.json();
        
        let totalMsg = countData.count || '29383';
        let emotionalMsg = '0';
        
        if (emotionData.success && emotionData.result?.stats) {
          emotionalMsg = emotionData.result.stats.emotional_messages || '0';
        }
        
        chrome.storage.local.set({messageCount: totalMsg});
        
        document.getElementById('totalMessages').textContent = 
          `${totalMsg} (感情: ${emotionalMsg})`;
      }

      if (document.getElementById('sessionCount')) {
        const sessionCount = dashboardData.totalSessions || dashboardData.sessionCount || '-';
        document.getElementById('sessionCount').textContent = sessionCount;
      }

      if (document.getElementById('lastSave')) {
        const lastSave = dashboardData.lastUpdate 
          ? new Date(dashboardData.lastUpdate).toLocaleTimeString('ja-JP')
          : new Date().toLocaleTimeString('ja-JP');
        document.getElementById('lastSave').textContent = lastSave;
      }

      // ストレスタブ
      if (document.getElementById('stressCause')) {
        let mainStressor = '分析中';
        if (stressAnalysis.success && stressAnalysis.result) {
          const triggers = stressAnalysis.result.top_triggers;
          if (triggers && triggers.length > 0) {
            mainStressor = triggers.slice(0, 3).map(t => t.keyword).join('、');
          }
        }
        document.getElementById('stressCause').textContent = mainStressor;
      }

      if (document.getElementById('stressAdvice')) {
        let advice = '休息を優先してください';
        const stressLevel = stressAnalysis.result?.overall_stress_level || 0;
        if (stressLevel < 20) {
          advice = '現在の良い状態を維持';
        } else if (stressLevel < 50) {
          advice = '定期的な休憩を確保';
        } else {
          advice = '早急に休息が必要です';
        }
        document.getElementById('stressAdvice').textContent = advice;
      }

      // 転職タブ
      if (document.getElementById('jobUrgency')) {
        let actualUrgency = 40;
        
        if (stressAnalysis.success && stressAnalysis.result) {
          const stressLevel = stressAnalysis.result.overall_stress_level || 0;
          actualUrgency = Math.min(100, Math.max(0, stressLevel + 20));
        }
        
        document.getElementById('jobUrgency').textContent = `${actualUrgency}%`;
        document.getElementById('urgencyFill').style.width = `${actualUrgency}%`;
        
        const urgencyFill = document.getElementById('urgencyFill');
        if (actualUrgency > 80) {
          urgencyFill.style.background = '#f44336';
        } else if (actualUrgency > 60) {
          urgencyFill.style.background = '#ff9800';
        } else if (actualUrgency > 40) {
          urgencyFill.style.background = '#ffeb3b';
        } else {
          urgencyFill.style.background = '#4caf50';
        }
      }

      if (document.getElementById('jobReadiness')) {
        document.getElementById('jobReadiness').textContent = '40%';
      }

      if (document.getElementById('careerAdvice')) {
        document.getElementById('careerAdvice').textContent = 
          dashboardData.recommendations ? dashboardData.recommendations[2] : '準備を進める';
      }
      
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
  
  updateStats();
  setInterval(updateStats, 3000);
});