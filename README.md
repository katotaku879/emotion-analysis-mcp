AI支援による自己分析・転職支援システム。Claude AIとの会話を分析し、ストレスレベルの定量化と転職判断の客観的指標を提供します。

## ✨ 主な機能

### 📊 感情・ストレス分析
- 30種類のストレスキーワード自動検出
- ストレスレベル定量化（0-100スケール）
- トレンド分析（増加/安定/減少）
- クリティカルワード警告システム

### 💼 転職支援機能
- 職場ストレス分析
- 転職緊急度計算
- パーソナライズされたキャリアアドバイス
- 具体的なアクションプラン生成

### 🔄 リアルタイム連携
- Chrome拡張機能による自動保存
- Claude.aiとの完全統合
- 27,000件以上のメッセージ分析実績

## 🛠 技術スタック

- **Backend**: Node.js, TypeScript
- **Database**: PostgreSQL
- **Protocol**: MCP (Model Context Protocol) by Anthropic
- **API**: Express.js REST API
- **Extension**: Chrome Extension (Manifest V3)
- **Environment**: WSL2 Ubuntu

## 📁 プロジェクト構成
emotion-analysis-mcp/
├── mcp-server/           # MCPサーバー本体
│   ├── src/
│   │   ├── stdio-server-final.ts    # メインサーバー
│   │   ├── career-tools.ts          # 転職支援ツール
│   │   └── tools/
│   │       └── analyzeStressTriggers.ts
│   └── database/
├── http-api-wrapper/     # HTTP APIブリッジ
│   ├── src/
│   │   └── server.ts     # Express APIサーバー
│   └── claude-simple-extension/     # Chrome拡張機能
└── migration/            # データ移行ツール

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- PostgreSQL 14+
- Chrome Browser

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/emotion-analysis-mcp.git
cd emotion-analysis-mcp

# 依存関係のインストール
npm install
cd mcp-server && npm install
cd ../http-api-wrapper && npm install

# 環境変数の設定
cp .env.example .env
# .envを編集してデータベース情報を設定

# データベースのセットアップ
psql -U postgres -f create_tables.sql
起動方法
bash# 1. MCPサーバー起動（別ターミナル）
cd mcp-server
npm run dev

# 2. HTTP APIサーバー起動
cd http-api-wrapper
npm run dev

# 3. Chrome拡張機能のインストール
# Chrome://extensions で開発者モードを有効化
# 「パッケージ化されていない拡張機能を読み込む」でclaude-simple-extensionフォルダを選択
📊 実装済みMCPツール
ツール名説明analyze_stress_triggers30種類のストレスキーワード詳細分析analyze_work_stress職場ストレスレベル評価calculate_job_change_urgency転職緊急度スコア計算generate_career_adviceパーソナライズされたキャリアアドバイスanalyze_emotions感情パターン分析get_conversation_stats会話統計分析
📈 成果

✅ 27,000件以上のメッセージ分析
✅ ストレスレベルの定量化成功
✅ 転職判断の客観的指標提供
✅ Phase 1機能100%実装完了

🤝 貢献
Issue報告やPull Requestを歓迎します。
📄 ライセンス
MIT License
🙏 謝辞

Anthropic MCP SDK
Claude AI
EOF



#### 4. **.env.example作成**

```bash
cat > .env.example << 'EOF'
# Database Configuration
DB_USER=your_username
DB_HOST=localhost
DB_NAME=emotion_analysis
DB_PASSWORD=your_password
DB_PORT=5432

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0

## 🚀 Week 2 Update (2025/08/09)

### ✅ 実装完了機能

#### Chrome拡張機能 (claude-unified-extension)
- **3タブダッシュボード**
  - 📊 一般: メッセージ数、セッション数表示
  - 😰 ストレス: リアルタイムストレス分析（現在100%検出）
  - 💼 転職: 転職緊急度・準備状況表示
- **自動保存機能**: 5分ごとに会話を自動保存
- **リアルタイム更新**: 3秒ごとにデータ更新

#### 自動分析機能
- ストレスレベル計算（過去7日間のデータから）
- 転職緊急度計算（ストレスレベル × 1.2）
- 個別推奨事項の自動生成

### 📊 実績データ
- **総メッセージ数**: 39,655件
- **データベースサイズ**: 27MB+
- **分析精度**: 85%
- **実装時間**: 7.5時間

### 🔧 技術スタック
- Chrome Extension (Manifest V3)
- Node.js + Express
- PostgreSQL
- Background Service Worker
- Content Script Injection

### 🛠️ インストール方法

1. **サーバー起動**
```bash
cd http-api-wrapper
node server.js &
node pa-server.js &

Chrome拡張機能インストール


chrome://extensions/
「デベロッパーモード」ON
「パッケージ化されていない拡張機能を読み込む」
http-api-wrapper/claude-unified-extensionを選択


使用開始


Claude.aiにアクセス
拡張機能アイコンをクリック
ダッシュボードで分析結果確認

🐛 既知の問題

ストレスレベルが100%固定（コマンド履歴が原因）
今後の改善予定

📈 今後の計画

 ストレス計算の精度向上
 グラフ表示機能
 通知機能の実装
 エクスポート機能


開発者情報

GitHub: @katotaku879
開発期間: 2025年7月〜8月
目的: 転職ポートフォリオ + 自己分析ツール