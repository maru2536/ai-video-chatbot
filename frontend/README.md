# AI Video Chatbot 🤖

プレミアムデザインのAIビデオチャットボット

## 🚀 デモサイト
https://ai-video-chatbot-9skq.vercel.app/

## ✨ 機能
- 🤖 ChatGPT (GPT-3.5) による自然な会話
- 🎤 音声入力・音声読み上げ
- 💾 会話履歴の自動保存（localStorage）
- 🌙 ダークモード対応
- 📱 レスポンシブデザイン
- 💎 プレミアムUI（ゴールド×ブラック）

## 🛠️ セットアップ

### 必要な環境
- Node.js 18.0.0以上
- npm または yarn
- OpenAI APIキー

### インストール手順

```bash
# リポジトリをクローン
git clone https://github.com/maru2536/ai-video-chatbot.git
cd ai-video-chatbot/frontend

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
# .env.localを編集してOpenAI APIキーを設定

# 開発サーバーを起動
npm run dev