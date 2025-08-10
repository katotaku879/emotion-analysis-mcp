#!/bin/bash

echo "🔄 環境切り替えスクリプト"
echo "========================"
echo "1) 既存PostgreSQL (ポート5432) - 本番データ"
echo "2) Docker PostgreSQL (ポート5433) - テスト環境"
echo -n "選択してください [1-2]: "
read choice

case $choice in
    1)
        cp .env.local .env
        echo "✅ 既存環境に切り替えました"
        echo "   ポート: PostgreSQL(5432), API(3000), PA(3333)"
        echo "   データ: 43,433件の既存メッセージ"
        ;;
    2)
        cp .env.docker .env
        echo "✅ Docker環境に切り替えました"
        echo "   ポート: PostgreSQL(5433), API(3001), PA(3334)"
        echo "   データ: 新規/テスト用"
        ;;
    *)
        echo "❌ 無効な選択です"
        exit 1
        ;;
esac

echo ""
echo "📝 現在の設定:"
grep "DB_PORT\|API_PORT\|USE_DOCKER" .env