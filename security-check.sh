#!/bin/bash

echo "🔒 セキュリティチェック"
echo "========================"

# 1. シークレットファイルの権限チェック
echo "📁 シークレットファイル権限:"
ls -la secrets/

# 2. Dockerネットワーク分離確認
echo ""
echo "🌐 Dockerネットワーク:"
docker network inspect emotion-network

# 3. ポートバインディング確認（localhostのみか）
echo ""
echo "🔌 ポートバインディング:"
docker compose ps --format "table {{.Name}}\t{{.Ports}}"

# 4. コンテナのセキュリティ設定確認
echo ""
echo "🛡️ コンテナセキュリティ:"
docker inspect emotion-api | grep -E "ReadonlyRootfs|NoNewPrivileges|User"

# 5. SSL証明書の確認
echo ""
echo "🔐 SSL証明書:"
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep -E "Subject:|Not After"

echo ""
echo "✅ セキュリティチェック完了"