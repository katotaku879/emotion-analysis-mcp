// Popup UI のロジック
console.log('🎪 Popup script loaded');
console.log('🚀🚀🚀 popup.js file loaded!');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM ready!');
  
  // 転職準備タブのクリックイベント
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      console.log('Tab clicked:', tabName);
      
      if (tabName === 'career') {
        console.log('Career tab - loading checklist...');
        // 少し遅延してから読み込み
        setTimeout(() => {
          loadJobChecklist();
        }, 100);
      }
    });
  });
  
  // 初期表示で転職準備タブが開いていたら読み込み
  const careerTab = document.getElementById('career-tab');
  if (careerTab && careerTab.style.display !== 'none') {
    console.log('Career tab is active on load');
    loadJobChecklist();
  }
});

class PopupController {
  constructor() {
    this.init();
  }

  async init() {
    // DOM要素の取得
    this.elements = {
      loading: document.getElementById('loading'),
      content: document.getElementById('content'),
      currentProject: document.getElementById('current-project'),
      messageCount: document.getElementById('message-count'),
      sessionDuration: document.getElementById('session-duration'),
      stressLevel: document.getElementById('stress-level'),
      growthOrientation: document.getElementById('growth-orientation'),
      emotionalState: document.getElementById('emotional-state'),
      alertArea: document.getElementById('alert-area'),
      recommendations: document.getElementById('recommendations'),
      analyzeNowBtn: document.getElementById('analyze-now'),
      getAdviceBtn: document.getElementById('get-advice'),
      openOptionsBtn: document.getElementById('open-options'),
      viewHistoryBtn: document.getElementById('view-history')
    };

    // イベントリスナー設定
    this.setupEventListeners();

    // APIから統計を取得して更新
    this.updateStatsFromAPI();
    
    // 5秒ごとに自動更新
    setInterval(() => this.updateStatsFromAPI(), 5000);

    // 初期データ読み込み
    await this.loadInitialData();
  }
  
  // 新しいメソッド：APIから統計を取得
  async updateStatsFromAPI() {
    try {
      // APIから統計を取得
      const response = await fetch('http://localhost:3000/api/stats');
      const data = await response.json();
      
      if (data.success && data.stats) {
        // メッセージ数を更新
        const totalMessages = parseInt(data.stats.total_messages) || 0;
        if (this.elements.messageCount) {
          this.elements.messageCount.textContent = totalMessages;
        }
        
        // セッション時間を計算（最後のメッセージからの経過時間）
        if (data.stats.last_message_at) {
          const lastMessage = new Date(data.stats.last_message_at);
          const now = new Date();
          const minutes = Math.floor((now - lastMessage) / 60000);
          if (this.elements.sessionDuration) {
            // 経過時間を表示
            if (minutes < 1) {
              this.elements.sessionDuration.textContent = 'たった今';
            } else if (minutes < 60) {
              this.elements.sessionDuration.textContent = `${minutes}分前`;
            } else {
              const hours = Math.floor(minutes / 60);
              this.elements.sessionDuration.textContent = `${hours}時間前`;
            }
          }
        }
        
        // 現在のセッション数
        const sessions = parseInt(data.stats.total_sessions) || 0;
        const projectElement = document.getElementById('current-project');
        if (projectElement) {
          projectElement.textContent = `セッション ${sessions}`;
        }
        
        console.log('📊 Stats updated:', data.stats);
      }
    } catch (error) {
      console.error('❌ Failed to fetch stats:', error);
      // エラー時はローカルストレージのデータを使用
    }
  }

  setupEventListeners() {
    if (this.elements.analyzeNowBtn) {
      this.elements.analyzeNowBtn.addEventListener('click', () => {
        this.triggerAnalysis();
      });
    }

    if (this.elements.getAdviceBtn) {
      this.elements.getAdviceBtn.addEventListener('click', () => {
        this.getPersonalizedAdvice();
      });
    }

    if (this.elements.openOptionsBtn) {
      this.elements.openOptionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    if (this.elements.viewHistoryBtn) {
      this.elements.viewHistoryBtn.addEventListener('click', () => {
        this.showHistory();
      });
    }
  }

  async loadInitialData() {
    try {
      // Chrome storage からデータ読み込み
      const result = await chrome.storage.local.get([
        'currentSession',
        'realtimeStats',
        'lastAnalysis'
      ]);

      // UI更新
      this.updateUI(result);
      
      // ローディング完了
      if (this.elements.loading) {
        this.elements.loading.style.display = 'none';
      }
      if (this.elements.content) {
        this.elements.content.style.display = 'block';
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showError('データの読み込みに失敗しました');
    }
  }

  updateUI(data) {
    // 現在のセッション情報
    if (data.currentSession) {
      if (this.elements.currentProject) {
        this.elements.currentProject.textContent = data.currentSession.projectName || '未検出';
      }
      if (this.elements.messageCount) {
        this.elements.messageCount.textContent = data.currentSession.messageCount || 0;
      }
      
      // セッション時間計算
      if (data.currentSession.startTime && this.elements.sessionDuration) {
        const duration = Math.floor((Date.now() - new Date(data.currentSession.startTime)) / 60000);
        this.elements.sessionDuration.textContent = `${duration}分`;
      }
    }

    // リアルタイム統計
    if (data.realtimeStats) {
      if (this.elements.stressLevel) {
        this.elements.stressLevel.textContent = this.getStressLevelText(data.realtimeStats.stressScore);
      }
      if (this.elements.growthOrientation) {
        this.elements.growthOrientation.textContent = `${data.realtimeStats.growthScore || 0}%`;
      }
      if (this.elements.emotionalState) {
        this.elements.emotionalState.textContent = this.getEmotionalStateText(data.realtimeStats.emotionScore);
      }
    }

    // 推奨アクション
    if (data.lastAnalysis && data.lastAnalysis.recommendations) {
      this.updateRecommendations(data.lastAnalysis.recommendations);
    }
  }

  getStressLevelText(score) {
    if (!score) return '正常';
    if (score < 3) return '😌 正常';
    if (score < 6) return '⚠️ 注意';
    return '🚨 高い';
  }

  getEmotionalStateText(score) {
    if (!score) return '安定';
    if (score < 0) return '😔 低下';
    if (score > 0.5) return '😊 良好';
    return '😐 安定';
  }

  updateRecommendations(recommendations) {
    const container = this.elements.recommendations;
    if (!container) return;
    
    container.innerHTML = '';

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML = '<p style="margin: 0; opacity: 0.7;">現在特別な推奨事項はありません</p>';
      return;
    }

    recommendations.slice(0, 3).forEach(rec => {
      const item = document.createElement('div');
      item.style.cssText = 'margin-bottom: 8px; font-size: 14px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;';
      item.textContent = rec;
      container.appendChild(item);
    });
  }

  async triggerAnalysis() {
    if (!this.elements.analyzeNowBtn) return;
    
    this.elements.analyzeNowBtn.textContent = '分析中...';
    this.elements.analyzeNowBtn.disabled = true;

    try {
      // Background script に分析要求送信
      const response = await chrome.runtime.sendMessage({
        type: 'TRIGGER_ANALYSIS',
        data: { immediate: true }
      });

      if (response && response.success) {
        this.showAlert('✅ 分析が完了しました', 'success');
        // データ再読み込み
        await this.loadInitialData();
        // API統計も更新
        await this.updateStatsFromAPI();
      } else {
        throw new Error(response?.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      this.showAlert('❌ 分析に失敗しました', 'error');
    } finally {
      this.elements.analyzeNowBtn.textContent = '📊 今すぐ分析';
      this.elements.analyzeNowBtn.disabled = false;
    }
  }

  async getPersonalizedAdvice() {
    if (!this.elements.getAdviceBtn) return;
    
    this.elements.getAdviceBtn.textContent = 'アドバイス生成中...';
    this.elements.getAdviceBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_ADVICE',
        data: { focus_area: 'overall' }
      });

      if (response && response.success && response.advice) {
        this.showAdviceModal(response.advice);
      } else {
        throw new Error('Advice generation failed');
      }

    } catch (error) {
      console.error('Advice generation failed:', error);
      this.showAlert('❌ アドバイス生成に失敗しました', 'error');
    } finally {
      this.elements.getAdviceBtn.textContent = '💡 アドバイス';
      this.elements.getAdviceBtn.disabled = false;
    }
  }

  showAlert(message, type = 'info') {
    if (!this.elements.alertArea) return;
    
    const alert = document.createElement('div');
    alert.className = `alert ${type === 'success' ? 'success' : ''}`;
    alert.textContent = message;
    alert.style.cssText = `
      padding: 12px;
      margin: 8px 0;
      background: ${type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
      border-radius: 6px;
      animation: slideIn 0.3s ease;
    `;
    
    this.elements.alertArea.appendChild(alert);
    
    // 3秒後に自動削除
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 3000);
  }

  showAdviceModal(advice) {
    if (!this.elements.recommendations) return;
    
    // シンプルなアドバイス表示
    this.elements.recommendations.innerHTML = 
      `<div style="padding: 12px; background: rgba(255,255,255,0.15); border-radius: 8px; font-size: 14px; line-height: 1.4;">
        ${advice.substring(0, 200)}...
      </div>`;
    
    this.showAlert('💡 新しいアドバイスを表示しました', 'success');
  }

  showHistory() {
    // 履歴表示の簡易実装
    this.showAlert('📈 履歴機能は開発中です', 'info');
    
    // APIから統計を表示
    fetch('http://localhost:3000/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const message = `総メッセージ: ${data.stats.total_messages}件\nセッション数: ${data.stats.total_sessions}`;
          this.showAlert(message, 'info');
        }
      })
      .catch(console.error);
  }

  showError(message) {
    if (this.elements.loading) {
      this.elements.loading.style.display = 'none';
    }
    if (this.elements.content) {
      this.elements.content.style.display = 'block';
    }
    this.showAlert(`❌ ${message}`, 'error');
  }
}

// Popup読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
  console.log('✅ PopupController initialized');
});

// popup.jsに追加する完全統合コード

// リアルタイム分析機能
class AnalyticsIntegration {
  constructor() {
    this.riskLevel = 'unknown';
    this.emotionTrend = 'neutral';
    this.advice = [];
  }
  
  async updateAll() {
    await this.updateRiskDetection();
    await this.updateEmotionAnalysis();
    await this.updatePersonalizedAdvice();
  }
  
  // リスク検出
  async updateRiskDetection() {
    try {
      const response = await fetch('http://localhost:3000/api/detect-risks', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        this.riskLevel = data.risk_level;
        
        // UIを更新
        const stressElement = document.getElementById('stress-level');
        if (stressElement) {
          if (data.risk_level === 'high') {
            stressElement.innerHTML = '🚨 <span style="color: #ff4444;">高い</span>';
            // 警告表示
            this.showAlert('⚠️ ストレスレベルが高くなっています', 'warning');
          } else if (data.risk_level === 'medium') {
            stressElement.innerHTML = '⚠️ <span style="color: #ffaa00;">注意</span>';
          } else {
            stressElement.innerHTML = '✅ <span style="color: #44ff44;">正常</span>';
          }
        }
      }
    } catch (error) {
      console.error('Risk detection error:', error);
    }
  }
  
  // 感情分析
  async updateEmotionAnalysis() {
    try {
      const response = await fetch('http://localhost:3000/api/analyze-emotions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({period: '7 days'})
      });
      const data = await response.json();
      
      if (data.success) {
        this.emotionTrend = data.trend;
        
        // UIを更新
        const emotionElement = document.getElementById('emotional-state');
        if (emotionElement) {
          const emoji = data.trend === 'positive' ? '😊' : 
                        data.trend === 'negative' ? '😔' : '😐';
          emotionElement.innerHTML = `
            ${emoji} ${data.trend}
            <div style="font-size: 10px; margin-top: 4px;">
              😊 ${data.emotion_ratio.positive}% | 
              😔 ${data.emotion_ratio.negative}% | 
              😐 ${data.emotion_ratio.neutral}%
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Emotion analysis error:', error);
    }
  }
  
  // パーソナライズドアドバイス
  async updatePersonalizedAdvice() {
    try {
      const response = await fetch('http://localhost:3000/api/get-personalized-advice', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        this.advice = data.advice;
        
        // 推奨アクションエリアを更新
        const recommendationsElement = document.getElementById('recommendations');
        if (recommendationsElement) {
          recommendationsElement.innerHTML = '';
          
          // 優先度が高い場合は強調表示
          if (data.priority === 'urgent') {
            recommendationsElement.style.border = '2px solid #ff4444';
            recommendationsElement.style.padding = '10px';
          }
          
          // アドバイスを表示
          data.advice.slice(0, 3).forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = `
              margin-bottom: 8px;
              padding: 10px;
              background: rgba(255,255,255,0.1);
              border-radius: 8px;
              font-size: 13px;
              line-height: 1.4;
            `;
            div.textContent = item;
            recommendationsElement.appendChild(div);
          });
        }
      }
    } catch (error) {
      console.error('Advice generation error:', error);
    }
  }
  
  // アラート表示
  showAlert(message, type = 'info') {
    const alertArea = document.getElementById('alert-area');
    if (!alertArea) return;
    
    const alert = document.createElement('div');
    alert.style.cssText = `
      padding: 12px;
      margin: 8px 0;
      background: ${type === 'warning' ? 'rgba(255, 68, 68, 0.9)' : 'rgba(68, 255, 68, 0.9)'};
      color: white;
      border-radius: 8px;
      font-weight: bold;
      animation: pulse 2s infinite;
    `;
    alert.textContent = message;
    
    alertArea.appendChild(alert);
    
    // 10秒後に削除
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 10000);
  }
}


class TabManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.init();
    }
    
    init() {
        // タブボタンのイベントリスナー設定
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }
    
    switchTab(tabName) {
        // タブボタンの状態更新
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabButton) {
            tabButton.classList.add('active');
        }
        
        // タブコンテンツの表示切り替え
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        this.currentTab = tabName;
        
        // タブ別の初期化処理
        if (tabName === 'stress' && window.stressAnalysis) {
            window.stressAnalysis.loadData();
        } else if (tabName === 'career' && window.careerPrep) {
            window.careerPrep.loadData();
        }
        
        // CTAボタンのテキスト更新
        this.updateCTAButtons(tabName);
    }
    
    updateCTAButtons(tabName) {
        const mainCTA = document.getElementById('main-cta');
        const secondaryCTA = document.getElementById('secondary-cta');
        
        if (mainCTA && secondaryCTA) {
            switch(tabName) {
                case 'dashboard':
                    mainCTA.innerHTML = '<span>🚀</span> 今すぐ分析';
                    secondaryCTA.innerHTML = '<span>📊</span> 詳細';
                    break;
                case 'stress':
                    mainCTA.innerHTML = '<span>💼</span> 転職準備開始';
                    secondaryCTA.innerHTML = '<span>🔄</span> 再分析';
                    break;
                case 'career':
                    mainCTA.innerHTML = '<span>📝</span> 応募開始';
                    secondaryCTA.innerHTML = '<span>📋</span> チェック';
                    break;
            }
        }
    }
}

// アコーディオン制御
function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const isActive = header.classList.contains('active');
    
    if (isActive) {
        header.classList.remove('active');
        content.classList.remove('active');
    } else {
        header.classList.add('active');
        content.classList.add('active');
    }
}

// ストレス分析モジュール
class StressAnalysisModule {
    constructor() {
        this.data = null;
        this.isLoading = false;
    }
    
    async loadData() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            // ストレス分析APIを呼び出し
            const response = await fetch('http://localhost:3000/api/analyze-stress-triggers', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (result.success || result.data) {
                this.data = result.data;
                this.render();
            }
        } catch (error) {
            console.error('ストレス分析エラー:', error);
            this.renderError();
        } finally {
            this.isLoading = false;
        }
    }
    
    render() {
        if (!this.data) return;
        
        // ストレスレベル表示
        const score = this.data.overall_stress_level || 0;
        const scoreElement = document.getElementById('stress-score');
        const labelElement = document.getElementById('stress-label');
        const barFill = document.getElementById('stress-bar-fill');
        
        if (scoreElement) scoreElement.textContent = score + '/100';
        
        // レベル判定
        let level, levelClass;
        if (score > 70) {
            level = '危険レベル';
            levelClass = 'critical';
        } else if (score > 50) {
            level = '高ストレス';
            levelClass = 'high';
        } else if (score > 30) {
            level = '中程度';
            levelClass = 'medium';
        } else {
            level = '正常範囲';
            levelClass = 'low';
        }
        
        if (labelElement) labelElement.textContent = level;
        if (barFill) {
            barFill.className = `stress-bar-fill ${levelClass}`;
            barFill.style.width = `${score}%`;
        }
        
        // ストレス要因TOP5
        const triggersContainer = document.getElementById('stress-triggers');
        if (triggersContainer && this.data.top_triggers && this.data.top_triggers.length > 0) {
            let criticalCount = 0;
            triggersContainer.innerHTML = this.data.top_triggers.map((trigger, index) => {
                if (trigger.severity === 'critical') criticalCount++;
                return `
                    <div class="trigger-item severity-${trigger.severity || 'medium'}">
                        <span class="trigger-name">${index + 1}. ${trigger.keyword}</span>
                        <span class="trigger-count">${trigger.frequency}回</span>
                    </div>
                `;
            }).join('');
            
            // クリティカル数を更新
            const criticalBadge = document.getElementById('critical-count');
            if (criticalBadge) criticalBadge.textContent = criticalCount;
        }
        
        // トレンド分析
        if (this.data.trend_analysis) {
            const thisWeek = document.getElementById('trend-this-week');
            const lastWeek = document.getElementById('trend-last-week');
            
            if (thisWeek) thisWeek.textContent = this.data.trend_analysis.this_week || 0;
            if (lastWeek) lastWeek.textContent = this.data.trend_analysis.last_week || 0;
            
            const changeRate = this.data.trend_analysis.change_rate || 0;
            const trendMessage = document.getElementById('trend-message');
            
            if (trendMessage) {
                if (changeRate > 50) {
                    trendMessage.innerHTML = `<span style="color: #dc3545;">⚠️ ${changeRate}% 増加 - 急激に悪化しています</span>`;
                } else if (changeRate > 20) {
                    trendMessage.innerHTML = `<span style="color: #fd7e14;">↑ ${changeRate}% 増加 - 注意が必要です</span>`;
                } else if (changeRate < -20) {
                    trendMessage.innerHTML = `<span style="color: #28a745;">↓ ${Math.abs(changeRate)}% 減少 - 改善傾向です</span>`;
                } else {
                    trendMessage.innerHTML = `<span style="color: #6c757d;">→ 変化率: ${changeRate}% - 安定しています</span>`;
                }
            }
        }
        
        // 推奨アクション
        const recommendationsContainer = document.getElementById('stress-recommendations');
        if (recommendationsContainer && this.data.recommendations && this.data.recommendations.length > 0) {
            recommendationsContainer.innerHTML = this.data.recommendations.map((rec, index) => {
                const isUrgent = rec.includes('緊急') || rec.includes('今すぐ');
                return `<li class="recommendation-item ${isUrgent ? 'recommendation-urgent' : ''}">${rec}</li>`;
            }).join('');
        }
    }
    
    renderError() {
        const triggersContainer = document.getElementById('stress-triggers');
        if (triggersContainer) {
            triggersContainer.innerHTML = '<p style="color: #dc3545;">データの取得に失敗しました</p>';
        }
    }
}

// 転職準備モジュール
class CareerPrepModule {
    constructor() {
        this.readinessScore = 0;
        this.checklist = {
            portfolio: true,  // MCPシステム
            extension: true,  // Chrome拡張
            resume: false,    // 職務経歴書
            github: false,    // GitHub公開
            jobsite: false    // 転職サイト登録
        };
    }
    
    loadData() {
        this.calculateReadiness();
        this.render();
    }
    
    calculateReadiness() {
        const completed = Object.values(this.checklist).filter(v => v).length;
        const total = Object.keys(this.checklist).length;
        this.readinessScore = Math.round((completed / total) * 100);
    }
    
    render() {
        // 準備度スコア表示
        const scoreElement = document.getElementById('readiness-score');
        const labelElement = document.getElementById('readiness-label');
        const barFill = document.getElementById('readiness-bar-fill');
        
        if (scoreElement) {
            scoreElement.textContent = this.readinessScore + '%';
        }
        
        if (labelElement) {
            if (this.readinessScore >= 80) {
                labelElement.textContent = '応募可能！';
            } else if (this.readinessScore >= 60) {
                labelElement.textContent = 'もう少しで準備完了';
            } else if (this.readinessScore >= 40) {
                labelElement.textContent = '準備中';
            } else {
                labelElement.textContent = '準備を始めましょう';
            }
        }
        
        if (barFill) {
            barFill.style.width = `${this.readinessScore}%`;
        }
    }
}

// クイックアクション
async function quickAnalysis() {
    const btn = event.target.closest('button');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> 分析中...';
    btn.disabled = true;
    
    try {
        // 全分析を実行
        await Promise.all([
            window.stressAnalysis?.loadData(),
            window.popupController?.updateStatsFromAPI()
        ]);
        
        // ストレスタブに切り替え
        window.tabManager?.switchTab('stress');
        
        // 成功メッセージ
        showNotification('分析が完了しました', 'success');
    } catch (error) {
        showNotification('分析に失敗しました', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function openSettings() {
    chrome.runtime.openOptionsPage();
}

function showNotification(message, type = 'info') {
    const alertContent = document.getElementById('alert-content');
    if (!alertContent) return;
    
    const bgColor = type === 'success' ? 'rgba(40, 167, 69, 0.1)' : 
                    type === 'error' ? 'rgba(220, 53, 69, 0.1)' : 
                    'rgba(102, 126, 234, 0.1)';
    
    const borderColor = type === 'success' ? '#28a745' : 
                        type === 'error' ? '#dc3545' : 
                        '#667eea';
    
    alertContent.innerHTML = `
        <div style="padding: 8px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 4px; margin-bottom: 8px;">
            ${message}
        </div>
    `;
    
    // 5秒後に消去
    setTimeout(() => {
        if (alertContent) {
            alertContent.innerHTML = '<p style="color: #6c757d; font-size: 13px;">現在アラートはありません</p>';
        }
    }, 5000);
}

// ============================================
// 初期化処理
// ============================================

// 既存のPopupControllerとAnalyticsIntegration初期化
const popupController = new PopupController();
const analytics = new AnalyticsIntegration();

// 新しいモジュールの初期化
let tabManager, stressAnalysis, careerPrep;

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ PopupController initialized');
    
    // 新UIが存在する場合のみ初期化
    if (document.querySelector('.tab-navigation')) {
        tabManager = new TabManager();
        stressAnalysis = new StressAnalysisModule();
        careerPrep = new CareerPrepModule();
        
        // グローバル変数として公開（デバッグ用）
        window.tabManager = tabManager;
        window.stressAnalysis = stressAnalysis;
        window.careerPrep = careerPrep;
        
        console.log('✅ Hybrid UI initialized');
        
        // CTAボタンのイベント設定
        const mainCTA = document.getElementById('main-cta');
        if (mainCTA) {
            mainCTA.addEventListener('click', () => {
                const currentTab = tabManager.currentTab;
                
                switch(currentTab) {
                    case 'dashboard':
                        quickAnalysis();
                        break;
                    case 'stress':
                        tabManager.switchTab('career');
                        break;
                    case 'career':
                        alert('転職サイトへの登録機能は開発中です');
                        break;
                }
            });
        }
        
        const secondaryCTA = document.getElementById('secondary-cta');
        if (secondaryCTA) {
            secondaryCTA.addEventListener('click', () => {
                const currentTab = tabManager.currentTab;
                
                switch(currentTab) {
                    case 'dashboard':
                        tabManager.switchTab('stress');
                        break;
                    case 'stress':
                        stressAnalysis.loadData();
                        showNotification('再分析を実行しました', 'success');
                        break;
                    case 'career':
                        careerPrep.loadData();
                        break;
                }
            });
        }
    }
    
    // ========== 転職支援機能 ==========

// ストレス分析ボタンのイベントリスナー
document.getElementById('analyze-stress-btn').addEventListener('click', async () => {
  const button = document.getElementById('analyze-stress-btn');
  const resultsDiv = document.getElementById('stress-results');
  
  // ボタンを無効化してローディング表示
  button.disabled = true;
  button.textContent = '分析中...';
  button.style.background = '#999';
  
  try {
    // APIを呼び出し
    const response = await fetch('http://localhost:3000/api/analyze-stress-triggers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    if (data.success) {
      // ストレスレベルを表示
      displayStressLevel(data.data.overall_stress_level);
      
      // 危険キーワードを表示
      displayCriticalKeywords(data.data.critical_keywords);
      
      // 推奨事項を表示
      displayRecommendations(data.data.recommendations);
      
      // トレンド情報を表示
      displayTrend(data.data.trend_analysis);
      
      // 結果エリアを表示
      resultsDiv.style.display = 'block';
      
      // サマリーをアラート表示（オプション）
      if (data.data.overall_stress_level > 80) {
        alert('⚠️ 危険レベル！\n' + data.data.summary);
      }
    } else {
      alert('分析エラー: ' + (data.error || '不明なエラー'));
    }
  } catch (error) {
    console.error('Stress analysis error:', error);
    alert('分析に失敗しました: ' + error.message);
  } finally {
    // ボタンを元に戻す
    button.disabled = false;
    button.textContent = 'ストレス分析を実行';
    button.style.background = '#ff6b6b';
  }
});

// ストレスレベル表示関数
function displayStressLevel(level) {
  const bar = document.getElementById('stress-bar');
  const text = document.getElementById('stress-level-text');
  
  // バーの幅を設定
  bar.style.width = level + '%';
  
  // レベルに応じて色とテキストを設定
  let status = '';
  let color = '';
  
  if (level >= 80) {
    status = '危険レベル';
    color = '#f44336';
  } else if (level >= 60) {
    status = '警戒レベル';
    color = '#ff9800';
  } else if (level >= 40) {
    status = '注意レベル';
    color = '#FFC107';
  } else if (level >= 20) {
    status = '軽度';
    color = '#8BC34A';
  } else {
    status = '正常';
    color = '#4CAF50';
  }
  
  text.textContent = `ストレスレベル: ${level}/100 (${status})`;
  text.style.color = color;
  text.style.fontWeight = 'bold';
}

// 危険キーワード表示関数
function displayCriticalKeywords(keywords) {
  const container = document.getElementById('critical-keywords');
  
  if (keywords && keywords.length > 0) {
    container.innerHTML = `
      <strong style="color: #d32f2f;">🚨 危険キーワード:</strong>
      <div style="margin-top: 5px;">
        ${keywords.map(k => `<span style="background: #ffebee; color: #c62828; padding: 2px 8px; margin: 2px; border-radius: 3px; display: inline-block; font-size: 12px;">${k}</span>`).join('')}
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

// 推奨事項表示関数
function displayRecommendations(recommendations) {
  const container = document.getElementById('recommendations');
  
  if (recommendations && recommendations.length > 0) {
    // 最初の3つだけ表示
    const topRecommendations = recommendations.slice(0, 3);
    
    container.innerHTML = `
      <strong style="color: #1976d2;">💡 推奨アクション:</strong>
      <ul style="margin: 5px 0; padding-left: 20px; font-size: 12px;">
        ${topRecommendations.map(r => `<li style="margin: 3px 0;">${r}</li>`).join('')}
      </ul>
    `;
  } else {
    container.innerHTML = '';
  }
}

// トレンド表示関数
function displayTrend(trend) {
  const container = document.getElementById('trend-info');
  
  if (trend) {
    const changeIcon = trend.change_rate > 0 ? '📈' : trend.change_rate < 0 ? '📉' : '➡️';
    const changeText = trend.change_rate > 0 ? '増加' : trend.change_rate < 0 ? '減少' : '横ばい';
    
    container.innerHTML = `
      <div style="background: #f5f5f5; padding: 8px; border-radius: 5px;">
        ${changeIcon} 今週: ${trend.this_week}件 | 先週: ${trend.last_week}件 | 傾向: ${changeText}
      </div>
    `;
  }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
  // 転職準備タブを開いたとき
  const careerTab = document.querySelector('[data-tab="career"]');
  if (careerTab) {
    careerTab.addEventListener('click', loadJobChecklist);
  }
});

// ========== 転職チェックリスト機能 ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded - checklist init');
  
  // 転職準備タブがクリックされたとき
  const careerTab = document.querySelector('[data-tab="career"]');
  if (careerTab) {
    careerTab.addEventListener('click', function() {
      console.log('Career tab clicked');
      setTimeout(loadJobChecklist, 100);
    });
  }
  
  // 初期表示時に転職準備タブがアクティブなら読み込み
  const activeCareer = document.querySelector('#career.active');
  if (activeCareer) {
    loadJobChecklist();
  }
});

// チェックリスト読み込み
// ========== チェックリスト読み込み（最終版） ==========
// チェックリスト読み込み（デバッグ版）
async function loadJobChecklist() {
  console.log('🔄 Loading checklist...');
  
  const container = document.getElementById('checklist-container');
  if (!container) {
    console.error('❌ Container not found');
    return;
  }
  
  try {
    // データ取得
    console.log('📡 Fetching data from API...');
    const response = await fetch('http://localhost:3000/api/job-checklist');
    const data = await response.json();
    console.log('✅ Data received:', data);
    
    if (data.success && data.data && data.data.tasks) {
      // HTML生成
      let html = `
        <div style="padding: 10px; background: #e8f5e9; margin-bottom: 15px; border-radius: 5px;">
          <strong>進捗: ${data.data.progress}%</strong> 
          (${data.data.completed}/${data.data.total}タスク完了)
        </div>
      `;
      
      data.data.tasks.forEach((task, index) => {
        const checked = task.completed ? 'checked' : '';
        const style = task.completed ? 'text-decoration: line-through; color: #999;' : '';
        
        html += `
          <label style="display: block; margin: 8px 0; cursor: pointer;">
            <input type="checkbox" 
                   class="task-checkbox"
                   ${checked} 
                   data-task-id="${task.id}"
                   data-index="${index}"
                   style="margin-right: 8px;">
            <span style="${style}">${task.task_name}</span>
          </label>
        `;
      });
      
      container.innerHTML = html;
      console.log('✅ HTML updated');
      
      // イベントリスナー追加（重要：setTimeoutで確実に追加）
      setTimeout(() => {
        const checkboxes = container.querySelectorAll('.task-checkbox');
        console.log(`🎯 Found ${checkboxes.length} checkboxes`);
        
        checkboxes.forEach((checkbox, i) => {
          checkbox.onclick = async function() {
            const taskId = this.dataset.taskId;
            const isChecked = this.checked;
            
            console.log('✅ Checkbox clicked!');
            console.log('  Task ID:', taskId);
            console.log('  Checked:', isChecked);
            
            if (!taskId) {
              console.error('❌ No task ID!');
              return;
            }
            
            try {
              console.log('📤 Sending update request...');
              const res = await fetch('http://localhost:3000/api/job-checklist/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  task_id: taskId,
                  completed: isChecked
                })
              });
              
              const result = await res.json();
              console.log('📥 Update response:', result);
              
              if (result.success) {
                console.log('✅ Update successful!');
                // 再読み込み
                setTimeout(() => {
                  console.log('🔄 Reloading checklist...');
                  loadJobChecklist();
                }, 500);
              } else {
                console.error('❌ Update failed:', result);
                this.checked = !isChecked;
              }
            } catch (err) {
              console.error('❌ Error:', err);
              this.checked = !isChecked;
            }
          };
        });
        
        console.log('✅ Event listeners attached');
      }, 100);
      
    } else {
      console.error('❌ No data');
      container.innerHTML = '<div>データなし</div>';
    }
  } catch (error) {
    console.error('❌ Load error:', error);
    container.innerHTML = '<div style="color: red;">エラー: ' + error.message + '</div>';
  }
}

// 転職準備タブがクリックされた時に実行
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM loaded');
  
  // タブ切り替え検知
  const tabs = document.querySelectorAll('[data-tab="career"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      console.log('📂 Career tab clicked');
      setTimeout(loadJobChecklist, 200);
    });
  });
});

// グローバルに公開
window.loadJobChecklist = loadJobChecklist;
    // 初回のデータ更新
    analytics.updateAll();
    
    // 30秒ごとに更新
    setInterval(() => analytics.updateAll(), 30000);
});

// CSS アニメーション追加（既存）
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
`;
document.head.appendChild(style);

// グローバル公開（デバッグ用）
window.popupController = popupController;
window.analytics = analytics;
window.toggleAccordion = toggleAccordion;
window.quickAnalysis = quickAnalysis;
window.showNotification = showNotification;

console.log('💡 Debug mode enabled. Use window object to access modules.');



