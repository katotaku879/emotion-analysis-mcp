#!/bin/bash

echo "================================"
echo "🔒 本番環境準備状況チェック"
echo "================================"

READY=true

# パスワードチェック
if grep -r "Apple0420\|password.*=.*['\"].*['\"]" src/tools/personal-ai/ 2>/dev/null | grep -v ".bak\|.backup"; then
  echo "❌ パスワードがハードコーディングされています"
  READY=false
else
  echo "✅ パスワードハードコーディング: なし"
fi

# 環境変数チェック
if grep -q "process.env.DB_PASSWORD" src/tools/personal-ai/db-config.ts; then
  echo "✅ 環境変数使用: 設定済み"
else
  echo "❌ 環境変数が使用されていません"
  READY=false
fi

# エラーハンドリング
if grep -q "throw new Error" src/tools/personal-ai/db-config.ts; then
  echo "✅ エラーハンドリング: 実装済み"
else
  echo "⚠️  エラーハンドリング: 基本のみ"
fi

# .gitignore
if [ -f ~/emotion-analysis-mcp/.gitignore ] && grep -q "\.env" ~/emotion-analysis-mcp/.gitignore; then
  echo "✅ .gitignore: 設定済み"
else
  echo "❌ .envファイルが.gitignoreに含まれていません"
  READY=false
fi

echo "================================"
if [ "$READY" = true ]; then
  echo "✅ 本番環境で使用可能です！"
else
  echo "⚠️  本番環境での使用前に修正が必要です"
fi
echo "================================"
