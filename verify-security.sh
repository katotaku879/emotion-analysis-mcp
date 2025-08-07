#!/bin/bash

echo "🔍 セキュリティ検証開始..."
echo "=========================="

PASS=0
FAIL=0

# 1. .envがGitに追加されていないか
echo -n "1. .envがGitから除外されている: "
if git ls-files | grep -q "^\.env$"; then
    echo "❌ FAIL - .envがGitに追加されています！"
    ((FAIL++))
else
    echo "✅ PASS"
    ((PASS++))
fi

# 2. .gitignoreに.envが含まれているか
echo -n "2. .gitignoreに.envが記載されている: "
if grep -q "^\.env$" .gitignore; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# 3. パスワードがコード内にハードコードされていないか
echo -n "3. ハードコードされたパスワードがない: "
if grep -r "password.*=.*['\"]" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "process.env" | grep -v "example" > /dev/null; then
    echo "❌ FAIL - パスワードがハードコードされています"
    ((FAIL++))
else
    echo "✅ PASS"
    ((PASS++))
fi

# 4. .envファイルの権限
echo -n "4. .envファイルの権限が適切(600): "
if [ -f .env ]; then
    perms=$(stat -c %a .env)
    if [ "$perms" = "600" ]; then
        echo "✅ PASS"
        ((PASS++))
    else
        echo "❌ FAIL (現在: $perms)"
        ((FAIL++))
    fi
else
    echo "⚠️  SKIP (.envが存在しません)"
fi

echo ""
echo "=========================="
echo "結果: PASS: $PASS / FAIL: $FAIL"
if [ $FAIL -eq 0 ]; then
    echo "🎉 全てのセキュリティチェックに合格しました！"
else
    echo "⚠️  セキュリティ問題を修正してください"
fi
