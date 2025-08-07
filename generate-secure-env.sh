#!/bin/bash

echo "🔐 Generating secure .env file..."

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env already exists. Backup will be created as .env.backup"
    cp .env .env.backup
fi

# Generate secure random secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
BACKUP_KEY=$(openssl rand -base64 32)

# Get database password securely
echo -n "Enter PostgreSQL password (will not be shown): "
read -s DB_PASSWORD
echo

# Create .env file
cat > .env << ENVFILE
# Generated on $(date)
# === Database Configuration ===
DB_USER=mkykr
DB_HOST=localhost
DB_NAME=emotion_analysis
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=5432
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000

# === API Configuration ===
API_PORT=3000
API_HOST=127.0.0.1

# === Security Settings ===
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# === Rate Limiting ===
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# === CORS Settings ===
CORS_ORIGIN=https://claude.ai,chrome-extension://*
CORS_CREDENTIALS=true

# === Environment ===
NODE_ENV=development

# === Logging ===
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# === MCP Server Settings ===
MCP_PROTOCOL_VERSION=0.1.0
MCP_SERVER_NAME=emotion-analysis-mcp
MCP_TIMEOUT_MS=30000

# === Feature Flags ===
ENABLE_STRESS_ANALYSIS=true
ENABLE_CAREER_ADVICE=true
ENABLE_DEBUG_MODE=false

# === Backup & Recovery ===
BACKUP_ENABLED=false
BACKUP_PATH=/secure/backup/location
BACKUP_ENCRYPTION_KEY=${BACKUP_KEY}
ENVFILE

# Set secure permissions
chmod 600 .env

echo "✅ Secure .env file generated"
echo "📝 File permissions set to 600 (owner read/write only)"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "   1. Never commit .env to Git"
echo "   2. Add .env to .gitignore"
echo "   3. Keep .env.example as reference"
echo "   4. Rotate secrets regularly"
