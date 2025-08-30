#!/bin/bash

echo "================================"
echo "🧪 Personal AI 完全統合テスト"
echo "================================"

# 色の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# テスト結果カウンター
PASSED=0
FAILED=0

# テスト関数
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data" -w "\n%{http_code}")
    else
        response=$(curl -s "$url" -w "\n%{http_code}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED=$((PASSED + 1))
        
        # 結果の一部を表示
        if [ "$name" = "Self Profile" ]; then
            echo "  性格スコア: $(echo $body | jq -c '.personality_traits')"
        elif [ "$name" = "Emotion Patterns" ]; then
            echo "  パターン数: $(echo $body | jq 'length')"
        elif [ "$name" = "Predictions" ]; then
            echo "  予測数: $(echo $body | jq 'length')"
        elif [ "$name" = "Cause Analysis" ]; then
            echo "  分析結果: $(echo $body | jq -r '.summary' | head -c 80)..."
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $http_code)"
        FAILED=$((FAILED + 1))
    fi
}

# サーバー確認
echo "📡 サーバー状態確認"
echo "------------------------"
test_endpoint "MCP Server Health" "GET" "http://localhost:3001/health"
test_endpoint "API Wrapper Health" "GET" "http://localhost:3000/api/health"

echo ""
echo "🤖 Personal AI エンドポイント"
echo "------------------------"
test_endpoint "Self Profile" "GET" "http://localhost:3000/api/personal-ai/self-profile"
test_endpoint "Emotion Patterns" "GET" "http://localhost:3000/api/personal-ai/emotion-patterns"
test_endpoint "Predictions" "GET" "http://localhost:3000/api/personal-ai/predictions"
test_endpoint "Cause Analysis" "POST" "http://localhost:3000/api/personal-ai/analyze-cause" '{"question":"なぜ疲れやすいの？","timeframe":30}'

echo ""
echo "================================"
echo "📊 テスト結果"
echo "================================"
echo -e "${GREEN}✅ 成功: $PASSED${NC}"
echo -e "${RED}❌ 失敗: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 すべてのテストが成功しました！${NC}"
else
    echo -e "\n${RED}⚠️  一部のテストが失敗しました${NC}"
fi
