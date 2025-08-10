# セットアップガイド

## 必要な環境
- Docker
- Docker Compose V2
- Node.js 20+
- PostgreSQL 16
- WSL2 (Windows環境の場合)

## クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/katotaku879/emotion-analysis-mcp.git
cd emotion-analysis-mcp

# 依存関係インストール
cd http-api-wrapper && npm install && cd ..
cd mcp-server && npm install && cd ..

# 環境設定
cp .env.example .env
./generate-secrets.sh

# SSL証明書生成
mkdir -p nginx/ssl
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=EmotionAnalysis/CN=localhost"
cd ../..

# Docker起動
docker compose up -d

# 確認
docker compose ps

環境構成
ポート割り当て
サービス 既存環境 Docker環境
PostgreSQL 5432 5433
APIサーバー3000 3001
PAサーバー3333 3334
Nginx-80, 443

環境切り替え
./switch-env.sh
# 1: 既存DB（本番データ）
# 2: Docker DB（テスト環境）

## トラブルシューティング

ポート競合やヘルスチェック失敗時の対処法

# 既存PostgreSQL停止
sudo systemctl stop postgresql

# 使用中のポート確認
sudo lsof -i :3000

# ログ確認
docker compose logs api-server --tail=50

# 再起動
docker compose restart api-server

完全リセット
docker compose down
docker volume prune
docker compose up -d --build