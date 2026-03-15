#!/bin/bash

COMMAND=$1

stop_dev() {
  echo "🛑 Stopping development servers (Vite and Express)..."
  pkill -f "vite --host 0.0.0.0"
  pkill -f "tsx watch src/server/index.ts"
  pkill -f "stripe listen"
  echo "✅ Development servers and Stripe CLI stopped."
}

case $COMMAND in
  start)
    if [ ! -d node_modules ]; then
      echo "📦 Installing dependencies..."
      npm install
    fi
    echo "🚀 Starting development environment..."
    
    # .env から STRIPE_SECRET_KEY を取得 (引用符を削除)
    STRIPE_KEY=$(grep "^STRIPE_SECRET_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

    # Stripe CLI がインストールされている場合のみバックグラウンドで起動
    if command -v stripe &> /dev/null && [ -n "$STRIPE_KEY" ]; then
      echo "🛠️  Starting Stripe CLI for local webhooks with API key from .env..."
      stripe listen --api-key "$STRIPE_KEY" --forward-to localhost:3005/api/stripe-webhook &
    elif command -v stripe &> /dev/null; then
      echo "⚠️  STRIPE_SECRET_KEY not found in .env. Starting Stripe CLI with default auth..."
      stripe listen --forward-to localhost:3005/api/stripe-webhook &
    else
      echo "⚠️  Stripe CLI not found. Skipping webhook forwarding."
    fi

    npm run dev
    ;;
  stop)
    stop_dev
    ;;
  restart)
    stop_dev
    echo "🔄 Restarting development environment..."
    $0 start
    ;;
  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
    ;;
esac
