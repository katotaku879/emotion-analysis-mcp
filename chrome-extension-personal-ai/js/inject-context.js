// Personal AI Context Injector - CSP回避版
console.log('🔥 inject-context.js 読み込み開始');

// メインスクリプトを外部ファイルとして注入
const script = document.createElement('script');
script.src = chrome.runtime.getURL('js/main-script.js');
script.onload = function() {
    console.log('✅ メインスクリプト読み込み完了');
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// バックアップ：5秒後にインジケーター追加
setTimeout(() => {
    if (!document.querySelector('#personal-ai-indicator')) {
        const indicator = document.createElement('div');
        indicator.id = 'personal-ai-indicator';
        indicator.style.cssText = 'position:fixed;bottom:20px;left:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:8px 16px;border-radius:20px;z-index:99999;font-size:12px;font-weight:bold;';
        indicator.textContent = '🤖 AI分析ON';
        document.body.appendChild(indicator);
        console.log('✅ インジケーター追加（バックアップ）');
    }
}, 5000);

console.log('✅ inject-context.js 実行完了');