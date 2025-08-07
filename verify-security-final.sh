#!/bin/bash

echo "🔒 最終セキュリティチェック"
echo "=============================="

PASS=0
FAIL=0

# 1. Git初期化確認
echo -n "1. Gitリポジトリ: "
if git status > /dev/null 2>&1; then
    echo "✅ 初期化済み"
    ((PASS++))
else
    echo "❌ 未初期化 (git init を実行)"
    ((FAIL++))
fi

# 2. .envがGitから除外
echo -n "2. .envの除外: "
if git status > /dev/null 2>&1; then
    if git ls-files | grep -q "^\.env$"; then
        echo "❌ .envがGitに含まれています"
        ((FAIL++))
    else
        echo "✅ 除外済み"
        ((PASS++))
    fi
else
    echo "✅ Git未初期化（OK）"
    ((PASS++))
fi

# 3. .gitignoreの確認
echo -n "3. .gitignore設定: "
if grep -q "^\.env$" .gitignore; then
    echo "✅ .env記載あり"
    ((PASS++))
else
    echo "❌ .env記載なし"
    ((FAIL++))
fi

# 4. ハードコードされたパスワード
echo -n "4. ハードコードパスワード: "
if grep -r "emotion123\|Apple0420" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "node_modules" | grep -v ".bak" | grep -v "dist" | grep -v ".backup" > /dev/null; then
    echo "❌ 検出"
    ((FAIL++))
else
    echo "✅ なし"
    ((PASS++))
fi

# 5. .envファイル権限
echo -n "5. .env権限(600): "
if [ -f .env ]; then
    perms=$(stat -c %a .env)
    if [ "$perms" = "600" ]; then
        echo "✅ 適切"
        ((PASS++))
    else
        echo "❌ $perms (chmod 600 .env を実行)"
        ((FAIL++))
    fi
else
    echo "⚠️  .envなし"
fi

# 6. distフォルダ除外
echo -n "6. distフォルダ除外: "
if grep -q "dist/" .gitignore; then
    echo "✅ 除外済み"
    ((PASS++))
else
    echo "⚠️  未設定"
fi

echo ""
echo "=============================="
echo "結果: PASS: $PASS / FAIL: $FAIL"
echo "=============================="

if [ $FAIL -eq 0 ]; then
    echo "🎉 全セキュリティチェック合格！"
    echo "🚀 GitHubへアップロード可能です"
else
    echo "⚠️  問題を修正してください"
fi
