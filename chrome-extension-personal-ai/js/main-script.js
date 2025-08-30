// main-script.js - 質問別分析対応版
(function() {
    console.log('🎯 Personal AI 自動分析を初期化（質問別対応版）');
    
    // パターン定義
    const patterns = [
        /なぜ.*最近/,
        /どうして.*最近/,
        /最近.*理由/,
        /最近.*原因/,
        /最近.*疲れ/,
        /最近.*つらい/,
        /最近.*しんどい/,
        /最近.*イライラ/,
        /最近.*眠れない/,
        /最近.*ストレス/,
        /最近.*調子/,
        /最近.*体調/,
        /最近.*気分/,
        /最近.*集中/,
        /ここ.*日/,
        /この.*週間/,
        /この頃/,
        /今週/,
        /今月/
    ];
    
    // 質問タイプを判定
    function getAnalysisContext(text) {
        if (/イライラ|ストレス|気分|落ち込|不安/.test(text)) {
            return 'emotional';
        }
        if (/眠れない|睡眠|寝/.test(text)) {
            return 'sleep';
        }
        if (/集中|ミス|忘れ/.test(text)) {
            return 'cognitive';
        }
        if (/疲れ|だるい|しんどい/.test(text)) {
            return 'fatigue';
        }
        if (/体調|調子/.test(text)) {
            return 'health';
        }
        return 'general';
    }
    
    let inputTimer;
    let lastText = '';
    let processing = false;
    
    function setupListener() {
        const input = document.querySelector('.ProseMirror[contenteditable="true"]');
        if (!input) {
            setTimeout(setupListener, 1000);
            return;
        }
        
        input.addEventListener('input', function() {
            const currentText = this.textContent || '';
            
            clearTimeout(inputTimer);
            
            inputTimer = setTimeout(async () => {
                if (processing || currentText === lastText) return;
                
                const matchesPattern = patterns.some(p => p.test(currentText));
                const hasAnalysis = currentText.includes('分析結果');
                
                if (matchesPattern && !hasAnalysis) {
                    processing = true;
                    
                    // 質問タイプを判定
                    const context = getAnalysisContext(currentText);
                    console.log('📊 分析を実行:', currentText);
                    console.log('📋 分析タイプ:', context);
                    
                    const notif = document.createElement('div');
                    notif.style.cssText = 'position:fixed;top:20px;right:20px;background:#2196F3;color:white;padding:12px 24px;border-radius:8px;z-index:999999;';
                    notif.textContent = '🔄 分析中...';
                    document.body.appendChild(notif);
                    
                    try {
                        // コンテキストに応じたメッセージを送信
                        const analysisMessage = context === 'emotional' ? 
                            `${currentText} 感情やストレスの観点から分析してください` :
                            context === 'sleep' ?
                            `${currentText} 睡眠パターンの観点から分析してください` :
                            context === 'cognitive' ?
                            `${currentText} 集中力や認知機能の観点から分析してください` :
                            context === 'fatigue' ?
                            `${currentText} 疲労の種類（身体的/精神的）を特定して分析してください` :
                            context === 'health' ?
                            `${currentText} 健康状態全般の観点から分析してください` :
                            currentText;
                        
                        const res = await fetch('http://localhost:3000/api/personal-ai/analyze', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': 'hkjvh/LalSSa+DoC6S5MuzET25UqAjG43ohAEBojfjI='
                            },
                            body: JSON.stringify({
                                type: 'cause_analysis',
                                message: analysisMessage,
                                timeframe: 30,
                                context: context  // コンテキストも送信
                            })
                        });
                        
                        const data = await res.json();
                        
                        if (data.success) {
                            this.focus();
                            
                            const selection = window.getSelection();
                            const range = document.createRange();
                            range.selectNodeContents(this);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                            
                            // コンテキストに応じた前置きを追加
                            const prefix = context === 'emotional' ? '【感情分析結果】' :
                                         context === 'sleep' ? '【睡眠分析結果】' :
                                         context === 'cognitive' ? '【認知機能分析結果】' :
                                         context === 'fatigue' ? '【疲労分析結果】' :
                                         context === 'health' ? '【健康状態分析結果】' :
                                         '【私のデータ分析結果】';
                            
                            document.execCommand('insertText', false, '\n\n');
                            const result = `${prefix}\n${data.result.summary}\n主要因：${data.result.findings?.[0]}\n\nこの分析結果を踏まえて、具体的なアドバイスをください。`;
                            document.execCommand('insertText', false, result);
                            
                            console.log('✅ 分析結果を追加');
                            lastText = this.textContent;
                            
                            notif.textContent = '✅ 分析完了';
                            notif.style.background = '#4CAF50';
                            setTimeout(() => notif.remove(), 2000);
                        }
                    } catch (error) {
                        console.error('エラー:', error);
                        notif.textContent = '❌ エラー';
                        notif.style.background = '#f44336';
                        setTimeout(() => notif.remove(), 2000);
                    }
                    
                    processing = false;
                }
            }, 1000);
        });
        
        console.log('✅ イベントリスナー設定完了');
    }
    
    // インジケーター
    setTimeout(() => {
        if (!document.querySelector('#ai-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'ai-indicator';
            indicator.style.cssText = 'position:fixed;bottom:20px;left:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:8px 16px;border-radius:20px;z-index:99999;font-size:12px;font-weight:bold;';
            indicator.textContent = '🤖 AI分析ON';
            document.body.appendChild(indicator);
        }
    }, 2000);
    
    setupListener();
    console.log('✅ Personal AI 自動分析が有効（質問別対応）');
})();