// 自動分析機能（server.jsに追加する内容）

// 定期分析の結果を保存
let analysisCache = {
  lastUpdate: null,
  stressAnalysis: null,
  jobUrgency: null,
  recommendations: null
};

// 自動分析を実行（5分ごと）
async function performAutoAnalysis() {
  console.log('🔄 自動分析開始...');
  
  try {
    // 1. ストレス分析
    const stressResult = await analyzeWorkStress();
    
    // 2. 転職緊急度
    const jobResult = await calculateJobChangeUrgency();
    
    // 3. 推奨事項生成
    const recommendations = generateRecommendations(stressResult, jobResult);
    
    // キャッシュに保存
    analysisCache = {
      lastUpdate: new Date().toISOString(),
      stressAnalysis: stressResult,
      jobUrgency: jobResult,
      recommendations: recommendations
    };
    
    console.log('✅ 自動分析完了');
    
    // 危険レベルの場合、アラート
    if (stressResult.level > 80 || jobResult.urgency > 80) {
      console.log('⚠️ 警告: 高ストレス/転職緊急度を検出');
    }
    
  } catch (error) {
    console.error('❌ 自動分析エラー:', error);
  }
}

// 分析結果を取得するエンドポイント
app.get('/api/auto-analysis', (req, res) => {
  res.json({
    ...analysisCache,
    isRealtime: false,
    nextUpdate: new Date(Date.now() + 300000).toISOString()
  });
});

// リアルタイム分析エンドポイント
app.post('/api/analyze-now', async (req, res) => {
  await performAutoAnalysis();
  res.json({
    ...analysisCache,
    isRealtime: true
  });
});

// 5分ごとに自動実行
setInterval(performAutoAnalysis, 300000);

// 起動時に初回実行
setTimeout(performAutoAnalysis, 5000);

console.log('✅ 自動分析機能を開始しました（5分ごと）');
