console.log('🎉 Claude Simple Save Extension Loaded!');
console.log('📍 URL:', window.location.href);
console.log('⏰ Time:', new Date().toLocaleTimeString());

// APIテスト関数をグローバルに定義
window.testAPI = async function() {
    console.log('🧪 Testing API connection...');
    try {
        const response = await fetch('http://localhost:3000/api/health');
        const data = await response.json();
        console.log('✅ API Connected:', data);
        return data;
    } catch (error) {
        console.error('❌ API Error:', error);
        return null;
    }
};

// メッセージ保存関数
window.saveMessage = async function(text, role) {
    try {
        const response = await fetch('http://localhost:3000/api/messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                message: text,
                role: role || 'human'
            })
        });
        const data = await response.json();
        console.log('✅ Message Saved:', data);
        return data;
    } catch (error) {
        console.error('❌ Save Error:', error);
        return null;
    }
};

// 初期化
(async function init() {
    console.log('🚀 Initializing...');
    
    // API接続テスト
    await window.testAPI();
    
    // メッセージ監視
    let lastCount = 0;
    
    setInterval(() => {
        const messages = document.querySelectorAll('[data-message-author-role]');
        
        if (messages.length > lastCount) {
            console.log(`📨 New message detected (${messages.length} total)`);
            
            const newMsg = messages[messages.length - 1];
            const role = newMsg.getAttribute('data-message-author-role');
            const content = newMsg.textContent;
            
            if (content && content.length > 0) {
                window.saveMessage(content, role);
            }
            
            lastCount = messages.length;
        }
    }, 3000);
    
    console.log('✅ Monitoring started (checking every 3 seconds)');
})();

console.log('💡 Available functions:');
console.log('  - window.testAPI() : Test API connection');
console.log('  - window.saveMessage(text, role) : Save a message manually');
