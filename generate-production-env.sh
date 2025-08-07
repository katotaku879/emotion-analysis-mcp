#!/bin/bash

echo "🔒 本番環境用.env生成スクリプト"
echo "================================"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# .envが既に存在する場合の確認
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  警告: .envファイルが既に存在します${NC}"
    echo -n "上書きしますか？ (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "中止しました"
        exit 0
    fi
    # バックアップ作成
    backup_file=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env "$backup_file"
    echo -e "${GREEN}✅ バックアップ作成: $backup_file${NC}"
fi

# 🔑 OpenSSLで暗号学的に安全な鍵を生成（256ビット）
echo -e "${GREEN}🔑 暗号鍵を生成中...${NC}"
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
API_KEY=$(openssl rand -base64 32)
BACKUP_KEY=$(openssl rand -base64 32)

# データベースパスワード生成（16文字の複雑なパスワード）
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

echo -e "${GREEN}✅ 全ての暗号鍵を生成しました${NC}"

# .envファイル作成
cat > .env << ENVFILE
# ================================================
# 🔒 PRODUCTION ENVIRONMENT CONFIGURATION
# Generated: $(date)
# Security Level: MAXIMUM
# ================================================
# WARNING: This file contains sensitive information
# NEVER commit this file to version control
# ================================================

# === DATABASE CONFIGURATION (PostgreSQL) ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emotion_analysis
DB_USER=mkykr
DB_PASSWORD=${DB_PASSWORD}
DB_SSL_MODE=require
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
DB_STATEMENT_TIMEOUT_MS=30000

# === API SERVER CONFIGURATION ===
NODE_ENV=production
API_PORT=3000
API_HOST=127.0.0.1
API_BASE_URL=https://your-domain.com

# === 🔐 SECURITY KEYS (256-bit) ===
# Generated with: openssl rand -base64 32
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
API_KEY=${API_KEY}
REFRESH_TOKEN_SECRET=${SESSION_SECRET}

# === AUTHENTICATION ===
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
SESSION_TIMEOUT_MS=3600000
PASSWORD_MIN_LENGTH=16
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_UPPERCASE=true

# === RATE LIMITING ===
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
RATE_LIMIT_SKIP_FAILED_REQUESTS=false

# === CORS CONFIGURATION ===
CORS_ENABLED=true
CORS_ORIGIN=https://claude.ai
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With
CORS_EXPOSED_HEADERS=X-Total-Count

# === SECURITY HEADERS ===
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true

# === LOGGING ===
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/var/log/emotion-analysis/app.log
LOG_FILE_MAX_SIZE=10485760
LOG_FILE_MAX_FILES=10
LOG_CONSOLE_ENABLED=false

# === MONITORING ===
MONITORING_ENABLED=true
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
METRICS_ENABLED=true
METRICS_PATH=/metrics

# === BACKUP & RECOVERY ===
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=${BACKUP_KEY}
BACKUP_PATH=/secure/backups

# === CHROME EXTENSION ===
EXTENSION_ID=your-extension-id-here
EXTENSION_SECRET=${API_KEY}

# === MCP SERVER ===
MCP_ENABLED=true
MCP_PROTOCOL_VERSION=0.1.0
MCP_TIMEOUT_MS=30000
MCP_MAX_RETRIES=3

# === FEATURE FLAGS ===
FEATURE_STRESS_ANALYSIS=true
FEATURE_CAREER_ADVICE=true
FEATURE_EMOTION_TRACKING=true
FEATURE_DEBUG_MODE=false
FEATURE_MAINTENANCE_MODE=false

# === NOTIFICATIONS ===
ALERT_EMAIL=admin@your-domain.com
ALERT_THRESHOLD_STRESS_LEVEL=80
ALERT_THRESHOLD_ERROR_RATE=5

# ================================================
# END OF CONFIGURATION
# ================================================
ENVFILE

# ファイル権限を600に設定（所有者のみ読み書き可能）
chmod 600 .env

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 本番環境用.envファイルが生成されました${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "📊 生成された暗号鍵情報:"
echo "  • JWT Secret: 256ビット (base64)"
echo "  • Session Secret: 256ビット (base64)"
echo "  • Encryption Key: 256ビット (base64)"
echo "  • API Key: 256ビット (base64)"
echo "  • DB Password: 16文字 (複雑)"
echo ""
echo -e "${YELLOW}⚠️  重要な注意事項:${NC}"
echo "  1. このファイルは絶対にGitにコミットしないでください"
echo "  2. .gitignoreに.envが含まれていることを確認してください"
echo "  3. 定期的に暗号鍵をローテーションしてください"
echo "  4. バックアップは暗号化された安全な場所に保管してください"
echo ""
echo -e "${RED}🔒 セキュリティチェック:${NC}"
echo -n "  • .envがgitignoreに含まれている: "
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ NG - .gitignoreに追加してください！${NC}"
fi
echo -n "  • ファイル権限が600: "
perms=$(stat -c %a .env 2>/dev/null)
if [ "$perms" = "600" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ NG - chmod 600 .env を実行してください${NC}"
fi
