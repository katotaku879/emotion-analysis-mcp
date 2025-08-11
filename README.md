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