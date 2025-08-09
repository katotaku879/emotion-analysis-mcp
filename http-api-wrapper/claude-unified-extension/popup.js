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
    console.log('updateStats開始');
  try {
    // 既存のダッシュボードデータ取得
    const dashboardResponse = await fetch('http://localhost:3000/api/dashboard');
    const dashboardData = await dashboardResponse.json();
    
    // 【追加】改善された感情分析を取得
    const emotionResponse = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'analyze_emotions',
        parameters: {
          period: '7 days',
          includeSystemMessages: false  // フィルタリング有効
        }
      })
    });
    const emotionData = await emotionResponse.json();
    console.log('Emotion data:', emotionData);

    if (document.getElementById('stressLevel')) {
      let actualStressLevel = 0;
      if (emotionData.success && emotionData.result) {
        const trends = emotionData.result.emotional_trends;
        const negativeRatio = trends.total > 0 ? (trends.negative / trends.total) * 100 : 0;
        actualStressLevel = Math.round(negativeRatio);
      } else {
        // フォールバック値
        actualStressLevel = dashboardData.stressLevel || 45;
      }
      
      console.log('Stress level:', actualStressLevel);
      document.getElementById('stressLevel').textContent = `${actualStressLevel}%`;
      document.getElementById('stressFill').style.width = `${actualStressLevel}%`;
      
      // 色の設定（既存のコード）
    }
    
    // PAサーバーからも取得
    const paResponse = await fetch('http://localhost:3333/api/pa/stats');
    const paData = await paResponse.json();
    
    // 【修正】より正確なストレスレベル計算
    let actualStressLevel = dashboardData.stressLevel || 0;
    if (emotionData.success && emotionData.result) {
      const trends = emotionData.result.emotional_trends;
      const negativeRatio = trends.total > 0 ? (trends.negative / trends.total) * 100 : 0;
      actualStressLevel = Math.round(negativeRatio);
    }
    
    // === 一般タブ ===（既存のコード）
    // === 一般タブ ===
  // === 一般タブ ===
  if (document.getElementById('totalMessages')) {
    // emotionDataから最新の情報を取得
    let totalMsg = dashboardData.totalMessages || '0';
    let emotionalMsg = '0';
    
    if (emotionData.success && emotionData.result?.stats) {
      const stats = emotionData.result.stats;
      totalMsg = stats.total_messages || totalMsg;
      emotionalMsg = stats.emotional_messages || '0';
    }
  
  document.getElementById('totalMessages').textContent = 
    `${totalMsg} (感情: ${emotionalMsg})`;
}
  // 【修正】最終保存時刻
  if (document.getElementById('sessionCount')) {
    // セッション数が取得できない場合のフォールバック
    const sessionCount = dashboardData.totalSessions || dashboardData.sessionCount || '-';
    document.getElementById('sessionCount').textContent = sessionCount;
  }

  // 【修正】最終保存時刻
  if (document.getElementById('lastSave')) {
    const lastSave = dashboardData.lastUpdate 
      ? new Date(dashboardData.lastUpdate).toLocaleTimeString('ja-JP')
      : new Date().toLocaleTimeString('ja-JP');
    document.getElementById('lastSave').textContent = lastSave;
  }

  // === ストレスタブ ===
  // 【修正】主な要因
  if (document.getElementById('stressCause')) {
    // paDataが取得できない場合のフォールバック
    let mainStressor = '分析中';
    if (emotionData.success && emotionData.result) {
      // ネガティブ感情が多い場合
      const trends = emotionData.result.emotional_trends;
      if (trends.negative > trends.positive) {
        mainStressor = '夜勤・トラブル対応';
      }
    }
    document.getElementById('stressCause').textContent = paData?.mainStressor || mainStressor;
  }

  // 【修正】推奨アドバイス
  if (document.getElementById('stressAdvice')) {
    let advice = '休息を優先してください';
    if (actualStressLevel < 20) {
      advice = '現在の良い状態を維持';
    } else if (actualStressLevel < 50) {
      advice = '定期的な休憩を確保';
    } else {
      advice = '早急に休息が必要です';
    }
    document.getElementById('stressAdvice').textContent = 
      dashboardData.recommendations?.[0] || advice;
  }
    // === 転職タブ ===
    if (document.getElementById('jobUrgency')) {
      // 【修正】感情データに基づく転職緊急度
      let actualUrgency = dashboardData.jobUrgency || 0;
      if (emotionData.success && emotionData.result) {
        const trends = emotionData.result.emotional_trends;
        const stats = emotionData.result.stats;
        
        // 基本値
        actualUrgency = 40;
        
        // ネガティブ感情の割合で加算
        const negativeRatio = trends.total > 0 ? trends.negative / trends.total : 0;
        if (negativeRatio > 0.1) actualUrgency += 30;  // 10%以上
        else if (negativeRatio > 0.05) actualUrgency += 20;  // 5%以上
        
        // 平均感情スコアで加算
        if (trends.averageScore < -1) actualUrgency += 20;
        else if (trends.averageScore < 0) actualUrgency += 10;
        
        // フィルタリング精度が低い（技術的な会話が多い）場合は減算
        if (parseFloat(stats.filtering_accuracy) < 15) actualUrgency -= 10;
        
        actualUrgency = Math.min(100, Math.max(0, actualUrgency));
      }
      
      document.getElementById('jobUrgency').textContent = `${actualUrgency}%`;
      document.getElementById('urgencyFill').style.width = `${actualUrgency}%`;
      
      // 緊急度に応じて色を変更
      const urgencyFill = document.getElementById('urgencyFill');
      if (actualUrgency > 80) {
        urgencyFill.style.background = '#f44336'; // 赤
      } else if (actualUrgency > 60) {
        urgencyFill.style.background = '#ff9800'; // オレンジ
      } else if (actualUrgency > 40) {
        urgencyFill.style.background = '#ffeb3b'; // 黄色
      } else {
        urgencyFill.style.background = '#4caf50'; // 緑
      }
    }
    
    // 残りは既存のコードのまま...
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

