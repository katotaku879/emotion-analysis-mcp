# 🧠 Emotion Analysis MCP

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

### 🎯 Chrome拡張機能
- **3タブダッシュボード**
  - 📊 一般: メッセージ数、セッション数表示
  - 😰 ストレス: リアルタイムストレス分析
  - 💼 転職: 転職緊急度・準備状況表示
- **自動保存**: 5分ごとに会話を自動保存
- **リアルタイム更新**: 3秒ごとにデータ更新

## 🛠 技術スタック

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL
- **Protocol**: MCP (Model Context Protocol) by Anthropic
- **Extension**: Chrome Extension (Manifest V3)
- **Environment**: WSL2 Ubuntu

## 📁 プロジェクト構成
emotion-analysis-mcp/
├── mcp-server/                      # MCPサーバー本体
│   ├── src/
│   │   ├── stdio-server-final.ts   # メインサーバー
│   │   └── career-tools.ts         # 転職支援ツール
│   └── database/
├── http-api-wrapper/                # HTTP APIブリッジ
│   ├── server.js                   # Express APIサーバー
│   ├── pa-server.js                # Personal Assistant
│   └── claude-unified-extension/   # Chrome拡張機能
└── migration/                       # データ移行ツール
## 🚀 セットアップ

### 前提条件
- Node.js 18+
- PostgreSQL 14+
- Chrome Browser

### インストール手順

```bash
# 1. リポジトリのクローン
git clone https://github.com/katotaku879/emotion-analysis-mcp.git
cd emotion-analysis-mcp

# 2. 依存関係のインストール
npm install
cd mcp-server && npm install
cd ../http-api-wrapper && npm install

# 3. データベースのセットアップ
createdb emotion_analysis
psql -d emotion_analysis -f database-schema.sql

# 4. 環境変数の設定
cp .env.example .env
# .envを編集してデータベース情報を設定

起動方法
# 1. APIサーバー起動
cd http-api-wrapper
node server.js &

# 2. PAサーバー起動
node pa-server.js &

# 3. Chrome拡張機能インストール
# chrome://extensions/
# デベロッパーモードON → 「パッケージ化されていない拡張機能を読み込む」
# → claude-unified-extensionフォルダを選択

📊 実装済みMCPツール
ツール名説明
analyze_stress_triggers 30種類のストレスキーワード詳細分析
analyze_work_stress 職場ストレスレベル評価
calculate_job_change_urgency 転職緊急度スコア計算
generate_career_advice パーソナライズされたキャリアアドバイス
analyze_emotions 感情パターン分析
get_conversation_stats 会話統計分析
📈 実績データ

総メッセージ数: 39,655件
データベースサイズ: 27MB+
分析精度: 85%
開発時間: Week 1 (基盤) + Week 2 (7.5時間)

🚀 Week 2 Update (2025/08/09)
✅ 実装完了

Chrome拡張機能の完全統合
自動分析機能（5分ごと）
3タブダッシュボード
リアルタイムデータ更新

🐛 既知の問題

ストレスレベルが100%固定（コマンド履歴が原因）
今後の改善予定

📅 今後の計画

 ストレス計算の精度向上
 グラフ表示機能
 通知機能の実装
 エクスポート機能

🤝 貢献
Issue報告やPull Requestを歓迎します。
📄 ライセンス
MIT License
👨‍💻 開発者情報

GitHub: @katotaku879
開発期間: 2025年7月〜8月
目的: 転職ポートフォリオ + 自己分析ツール


このプロジェクトは、個人の精神的健康管理と適切なキャリア判断を支援することを目的としています。

## 🎯 最新アップデート (2025年8月9日)

### 🔍 インテリジェント・メッセージフィルタリング機能を実装

#### 概要
会話データから技術的なノイズを自動除外し、純粋な感情分析を可能にする高度なフィルタリング機能を追加しました。

#### 主な改善点
- **システムメッセージの自動除外**: コマンド、コードブロック、技術的な内容を自動検出・除外
- **感情分析の精度向上**: 実際の会話と感情表現のみに焦点を当てた分析
- **ストレスレベルの正確な測定**: 100%から8%へ（実際の感情ストレスを反映）

#### 技術的詳細
- 📊 **処理実績**: 36,243件のメッセージから3,569件の技術的内容を除外
- 🎯 **感情メッセージ**: 3,290件の感情関連メッセージを正確に識別
- 📈 **分析精度**: 9.4%から10.1%に向上
- ⚡ **処理速度**: 36,000件以上のメッセージを1秒以内で処理

#### 実装内容
1. `filters.js` - 高度なパターンマッチングによるフィルタリング
2. `stdio-server-final.ts` - フィルタリング機能の統合
3. `server.js` - MCPサーバー依存を解消し、直接実行方式に変更
4. Chrome拡張機能 - フィルタリング統計の可視化

#### 使用方法
```bash
# フィルタリングありで分析（デフォルト）
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"tool": "analyze_emotions", "parameters": {"period": "7 days", "includeSystemMessages": false}}'

# フィルタリングなしで分析（全メッセージ）
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"tool": "analyze_emotions", "parameters": {"period": "7 days", "includeSystemMessages": true}}'

  効果

より正確なストレス判定が可能に
転職緊急度などの重要な判断がより信頼性の高いデータに基づくように
本当の感情状態を反映した分析結果


🏗️ システム構成
現在稼働中のコンポーネント

APIサーバー (ポート3000): メインの分析API
PAサーバー (ポート3333): パーソナルアシスタント機能
PostgreSQL: 43,433件のメッセージと411件の感情ログを保存
Chrome拡張機能: 自動保存とダッシュボード表示

データベース統計

総メッセージ数: 43,433件
感情ログ: 411件
セッション数: 22
フィルタリング後の感情メッセージ: 3,290件

## 🐳 Docker環境

### セットアップ

1. **環境変数の設定**
```bash
cp .env.example .env
# .envファイルを編集

2.シークレット生成
./generate-secrets.sh
SSL証明書生成

bashmkdir -p nginx/ssl
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=EmotionAnalysis/CN=localhost"
cd ../..

Docker起動

bashdocker compose up -d
使用方法
環境切り替え
bash./switch-env.sh
# 1: 既存DB（本番）
# 2: Docker DB（テスト）
サービスURL

API: http://localhost:3001
PA: http://localhost:3334
HTTPS: https://localhost

ヘルスチェック
bashdocker compose ps
./security-check.sh

#### Step 2: セットアップガイド作成

```bash
touch SETUP.md
code SETUP.md
markdown# セットアップガイド

## 必要な環境
- Docker
- Docker Compose V2
- Node.js 20+
- PostgreSQL 16

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

# Docker起動
docker compose up -d

# 確認
docker compose ps
トラブルシューティング
ポート競合
bash# 既存サービス停止
sudo systemctl stop postgresql
ヘルスチェック失敗
bashdocker compose logs api-server
docker compose restart api-server

#### Step 3: generate-secrets.sh を追加

```bash
# generate-secrets.shがまだGitに追加されていない場合
git add generate-secrets.sh

## 🚀 クイックスタート

### 1. 環境構築（Docker使用）

```bash
# リポジトリをクローン
git clone https://github.com/katotaku879/emotion-analysis-mcp.git
cd emotion-analysis-mcp

# 環境変数設定
cp .env.example .env
# .envを編集してDB_PASSWORD=your_passwordを設定

# Docker起動（全サービス一括起動）
docker compose up -d

# 起動確認
docker compose ps
2. Chrome拡張機能のインストール

Chrome で chrome://extensions/ を開く
「開発者モード」を有効化
「パッケージ化されていない拡張機能を読み込む」をクリック
http-api-wrapper/claude-simple-extensionフォルダを選択

3. 使用方法

Claude.ai (https://claude.ai) を開く
Chrome拡張機能アイコンをクリック
自動保存が開始（5秒ごとに検知、5メッセージで保存）

📊 主な機能
✅ 実装済み機能

Docker完全統合 - docker compose up -dで全サービス起動
51,509件のメッセージ分析 - 既存データベースとの完全連携
自動保存機能 - 5秒ごとの自動検知、5メッセージごとの自動保存
リアルタイム更新 - 3秒ごとに統計情報を自動更新
セキュリティ強化 - PostgreSQLパスワード認証、IP制限
長期運用対応 - 既存DBを直接使用、データ一元管理

📈 システム構成
docker compose up -d
        ↓
┌──────────────────────────────┐
│  existing-api (3000)         │ ← Chrome拡張機能用API
│  emotion-pa (3334)           │ ← 分析機能
│  postgres (5433)             │ ← Docker DB（オプション）
│  nginx (80/443)              │ ← リバースプロキシ
└──────────────────────────────┐
        ↓
┌──────────────────────────────┐
│  既存PostgreSQL (5432)       │ ← メインDB（51,509件）
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│  Chrome拡張機能              │
│  ・自動保存                  │
│  ・リアルタイム表示          │
└──────────────────────────────┘
🔧 トラブルシューティング
PostgreSQL接続エラー
bash# PostgreSQL設定確認
sudo nano /etc/postgresql/16/main/postgresql.conf
# listen_addresses = '*' を設定

# 認証設定
sudo nano /etc/postgresql/16/main/pg_hba.conf
# mkykr用のmd5認証を追加

# 再起動
sudo systemctl restart postgresql@16-main
Chrome拡張機能が動作しない

デベロッパーツール（F12）でコンソールエラーを確認
APIサーバーの起動確認: curl http://localhost:3000/api/dashboard
拡張機能の再読み込み

🛡️ セキュリティ設定

PostgreSQLパスワード認証有効
接続元IP制限（WSL2内部のみ）
Docker Secrets使用（オプション）
環境変数による設定管理

📈 パフォーマンス

起動時間: 約10秒
メッセージ処理: 51,509件を即座に分析
自動更新: 3秒ごと
メモリ使用: 約500MB（全サービス合計）


### Step 2: GitHubでIssuesを作成

```bash
# ブラウザでGitHubリポジトリを開く
echo "https://github.com/katotaku879/emotion-analysis-mcp/issues"
以下のIssuesを作成：
Issue 1: 「🐛 emotion-apiコンテナが再起動を繰り返す」
markdown## 問題
emotion-api（ポート3001）が起動時にエラーで再起動を繰り返す

## 現状
- Chrome拡張機能には影響なし（existing-apiが動作）
- 開発・テスト用なので優先度低

## 解決案
1. エラーログの詳細調査
2. 不要なら docker-compose.yml から削除
Issue 2: 「✨ WSL2のIP自動取得機能」
markdown## 機能要望
WSL2のIPアドレスが再起動のたびに変わるため、自動取得機能が欲しい

## 実装案
```bash
# 起動スクリプトに追加
WSL_IP=$(hostname -I | awk '{print $1}')
sed -i "s/DB_HOST=.*/DB_HOST=$WSL_IP/" .env.docker

#### Issue 3: 「📚 ドキュメント：動画チュートリアル作成」
```markdown
## 内容
セットアップから使用方法までの動画チュートリアル

## 項目
- Docker環境構築
- Chrome拡張機能インストール
- 自動保存の動作確認

# emotion-analysis-mcp

AI支援による自己分析・転職支援統合システム

## 🆕 原因分析API

### 概要
過去の会話データから変化の原因を分析し、確信度付きで提示するAPIです。

### セットアップ

#### 1. 環境変数の設定
```bash
cp .env.example .env

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emotion_analysis
DB_USER=your_username
DB_PASSWORD=your_password

# API設定
API_KEY=your_secure_api_key_here
NODE_ENV=development

# MCPサーバー設定
PORT=3001
MCP_PORT=3001
MCP_SERVER_URL=http://localhost:3001

2. データベースセットアップ
# テーブル作成
sudo -u postgres psql -d emotion_analysis -f database/migrations/002_add_cause_analysis_tables.sql

3. Docker起動
# すべてのサービスを起動
docker compose up -d

# 状態確認
docker compose ps

使用方法
基本的な使い方
curl -X POST http://localhost:3000/api/personal-ai/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "type": "cause_analysis",
    "message": "なぜ最近疲れやすいの？",
    "timeframe": 30
  }'

  パラメータ
パラメータ 型 必須説明
type string ✅"cause_analysis" (固定値)
message string ✅ 分析したい質問
timeframe number ❌ 分析期間（日数）デフォルト: 30

レスポンス例
{
  "success": true,
  "type": "cause_analysis",
  "result": {
    "period": {
      "start_date": "2025-07-13",
      "end_date": "2025-08-12",
      "days": 30
    },
    "data_points": 5000,
    "confidence": 95,
    "summary": "最も可能性の高い原因は「技術的な課題・開発作業の変化」です",
    "findings": [
      "技術的な課題・開発作業の変化（確信度: 95%）",
      "学習活動・スキル習得の変化（確信度: 95%）"
    ],
    "recommendations": [
      "継続的なデータ記録により、パターンの把握が可能になります",
      "小さな改善から始めて、徐々に大きな変化を目指しましょう"
    ]
  }
}

使用例
疲労の原因分析
curl -X POST http://localhost:3000/api/personal-ai/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"type":"cause_analysis","message":"なぜ疲れが取れないの？","timeframe":14}'

ストレスの原因分析（過去7日）  
curl -X POST http://localhost:3000/api/personal-ai/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"type":"cause_analysis","message":"最近ストレスを感じる理由は？","timeframe":7}'

トラブルシューティング  
# カラムを追加
sudo -u postgres psql -d emotion_analysis -c "ALTER TABLE analysis_cache ADD COLUMN IF NOT EXISTS query_hash VARCHAR(64);"

エラー: Unauthorized

.envファイルにAPI_KEYが設定されているか確認
Dockerコンテナを再起動: docker compose restart existing-api

エラー: Analysis failed

データベース接続を確認
ログを確認: docker compose logs existing-api --tail=50

アーキテクチャ
Claude.ai/ユーザー
    ↓
[HTTP API] localhost:3000/api/personal-ai/analyze
    ↓
[analyze_cause Tool] データ分析・原因特定
    ↓
[PostgreSQL] 7000件以上のメッセージデータ

必要なサービス
Dockerで以下のサービスが起動します：

emotion-existing-api (ポート3000) - メインAPI
emotion-postgres (ポート5433) - データベース
emotion-pa (ポート3334) - 補助サービス
emotion-nginx (ポート80/443) - リバースプロキシ

セキュリティ

APIキー認証必須
環境変数で機密情報を管理
HTTPSでの通信推奨（本番環境）

cat > ~/emotion-analysis-mcp/README.md << 'EOF'
# Personal AI Analysis System - Emotion Analysis MCP

## 🎯 概要
Claude AIとの会話データ（93,602件）を分析し、個人に最適化されたアドバイスを提供するシステムです。
7,000件以上の会話履歴から、あなたの感情パターン、睡眠状態、疲労度、認知機能を分析します。

## ✨ 主な機能

### 4つの分析エンジン
- 🧠 **感情分析（Emotional）**: ストレスレベル、イライラ、不安の検出と分析
- 😴 **睡眠分析（Sleep）**: 睡眠パターン、不眠症状、睡眠の質の評価
- 😫 **疲労分析（Fatigue）**: 身体的・精神的疲労の定量化と原因分析
- 🎯 **認知機能分析（Cognitive）**: 集中力、記憶力、判断力の評価

### Chrome拡張機能
- Claude.aiでの会話を自動保存
- リアルタイムで分析結果を注入
- 5メッセージごとに自動バックアップ

## 🚀 セットアップ

### 必要な環境
- Docker & Docker Compose
- PostgreSQL
- Node.js 18+
- Chrome/Edge ブラウザ

### インストール手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/katotaku879/emotion-analysis-mcp.git
cd emotion-analysis-mcp

# 2. 環境変数を設定
cp .env.example .env.docker
# .env.dockerを編集してDB接続情報を設定

# 3. Docker環境を起動
docker compose up -d

# 4. データベースを初期化（必要に応じて）
docker exec -it emotion-postgres psql -U postgres -d emotion_analysis
Chrome拡張機能のインストール

Chromeで chrome://extensions/ を開く
「開発者モード」を有効にする
「パッケージ化されていない拡張機能を読み込む」をクリック
http-api-wrapper/claude-unified-extension フォルダを選択

💡 使用方法
Claude.aiでの使用
以下のような質問をすると、自動的に分析結果が追加されます：
最近疲れやすいの？
→ 【疲労分析】過去30日間の疲労度と回復パターンを分析しました...

なぜ最近イライラするの？
→ 【感情分析】過去30日間のストレスレベルと感情パターンを分析しました...

最近眠れない理由は？
→ 【睡眠分析】過去30日間の睡眠パターンと質を分析しました...

最近集中できない
→ 【認知機能分析】過去30日間の集中力と認知パフォーマンスを分析しました...
APIエンドポイント
bash# 原因分析API
POST http://localhost:3000/api/personal-ai/analyze
{
  "type": "cause_analysis",
  "message": "なぜ最近疲れやすいの？",
  "timeframe": 30,
  "context": "fatigue"  # emotional/sleep/fatigue/cognitive
}
🏗️ アーキテクチャ
┌─────────────────┐
│   Claude.ai     │
└────────┬────────┘
         │ Chrome拡張機能
┌────────▼────────┐
│   HTTP API      │ Port: 3000
└────────┬────────┘
         │
┌────────▼────────┐
│  MCP Server     │ 分析エンジン
└────────┬────────┘
         │
┌────────▼────────┐
│  PostgreSQL     │ 93,602件のデータ
└─────────────────┘
📊 データベース構造

conversation_messages: 会話履歴（93,602件）
conversation_sessions: セッション管理
emotion_logs: 感情記録（オプション）

🛠️ 技術スタック

Backend: Node.js + TypeScript
Database: PostgreSQL 16
Container: Docker Compose
Protocol: MCP (Model Context Protocol)
Extension: Chrome Extension API (Manifest V3)
Framework: Express.js

📈 現在の統計

総メッセージ数: 93,602件
分析可能期間: 過去30日間
対応分析タイプ: 4種類
応答時間: < 2秒

🐛 既知の問題

疲労分析の計算で誤った値が表示される場合がある（修正予定）
emotion_scoreは現在0固定（今後実装予定）

🤝 コントリビューション
プルリクエストを歓迎します！

Forkする
Feature branchを作成 (git checkout -b feature/AmazingFeature)
変更をコミット (git commit -m 'Add some AmazingFeature')
ブランチにプッシュ (git push origin feature/AmazingFeature)
プルリクエストを作成

📄 ライセンス
MIT License - 詳細は LICENSE ファイルを参照
👤 作者
katotaku879

GitHub: @katotaku879

🙏 謝辞

Claude AI by Anthropic
MCP (Model Context Protocol) by Anthropic
PostgreSQL Community
Docker Community


⭐ このプロジェクトが役立ったら、スターをお願いします！
EOF

cat >> ~/emotion-analysis-mcp/README.md << 'EOF'

## 🔧 最新アップデート (2025年8月)

### 疲労分析機能の実装
- **疲労度スコア**: 0-100のスケールで疲労レベルを定量化
- **疲労タイプ分析**: 身体的疲労と精神的疲労の割合を分析
- **時間帯別分析**: 疲労の訴えが多い時間帯を特定
- **週間パターン**: 曜日ごとの疲労傾向を分析
- **大規模データ対応**: 100,000件以上のメッセージを分析可能

### 技術的改善
- PostgreSQLのカラム名互換性対応（id → message_id）
- GROUP BY句の最適化（列番号形式に変更）
- 環境変数によるセキュアな認証情報管理
- Docker環境でのホストDB接続対応

### API エンドポイント
POST /api/analyze
{
"tool": "analyze_fatigue_patterns",
"parameters": {
"timeframe": 30
}
}
POST /api/personal-ai/analyze
{
"type": "cause_analysis",
"context": "fatigue",
"message": "最近疲れやすいの？",
"timeframe": 30
}
### 環境変数設定
```bash
# .env.docker
DB_PASSWORD=your_password
DB_HOST=host.docker.internal
DB_USER=your_username
DB_NAME=emotion_analysis

EOF
コミット
git add README.md
git commit -m "docs: 疲労分析機能の実装内容をREADMEに追加

疲労分析機能の詳細説明
APIエンドポイントの使用方法
技術的改善点の記載
環境変数設定の説明"