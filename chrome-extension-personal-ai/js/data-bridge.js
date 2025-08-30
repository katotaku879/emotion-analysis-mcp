// Data Bridge - シンプル版
console.log('🌉 Data Bridge: 初期化');

// エラーを抑制
window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
        e.preventDefault();
        console.log('⚠️ Extension context invalidated (正常)');
    }
});

console.log('✅ Data Bridge: 準備完了');
