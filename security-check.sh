#!/bin/bash

echo "🔍 Running Security Check..."
echo ""

# Check for sensitive files
echo "Checking for sensitive files in Git..."
SENSITIVE=$(git ls-files 2>/dev/null | grep -E "\.env|password|secret|key|token" | grep -v example)

if [ -z "$SENSITIVE" ]; then
    echo "✅ No sensitive files in Git"
else
    echo "⚠️  WARNING: Sensitive files found in Git:"
    echo "$SENSITIVE"
fi

# Check file permissions
echo ""
echo "Checking .env file permissions..."
if [ -f .env ]; then
    PERMS=$(ls -l .env | awk '{print $1}')
    if [ "$PERMS" = "-rw-------" ]; then
        echo "✅ .env permissions are secure (600)"
    else
        echo "⚠️  WARNING: .env permissions are not secure"
        echo "   Run: chmod 600 .env"
    fi
else
    echo "ℹ️  .env file not found"
fi

# Check for hardcoded passwords
echo ""
echo "Checking for hardcoded passwords..."
HARDCODED=$(grep -r "password\|passwd\|pwd" --include="*.ts" --include="*.js" 2>/dev/null | grep -v "DB_PASSWORD" | grep -v "password:" | grep -v "//" | head -5)

if [ -z "$HARDCODED" ]; then
    echo "✅ No obvious hardcoded passwords found"
else
    echo "⚠️  WARNING: Possible hardcoded passwords found"
    echo "   Review these lines carefully"
fi

echo ""
echo "🔒 Security check complete"
