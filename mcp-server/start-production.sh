#!/bin/bash

# 本番環境起動スクリプト

# 環境変数のチェック
if [ ! -f .env.production ]; then
  echo "❌ エラー: .env.production ファイルが見つかりません"
  echo "📝 .env.production.example をコピーして設定してください："
  echo "   cp .env.production.example .env.production"
  exit 1
fi

# 環境変数を読み込み
export NODE_ENV=production
export $(cat .env.production | grep -v '^#' | xargs)

# 必須環境変数のチェック
required_vars=("DB_USER" "DB_PASSWORD" "DB_NAME")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ エラー: $var が設定されていません"
    exit 1
  fi
done

echo "✅ 環境変数チェック完了"
echo "🚀 本番環境で起動中..."

# アプリケーション起動
npm run build && npm start
