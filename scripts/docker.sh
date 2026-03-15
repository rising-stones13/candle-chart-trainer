#!/bin/bash

COMMAND=$1

case $COMMAND in
  start)
    if [ ! -f .env ]; then
      echo "Error: .env file not found."
      exit 1
    fi
    echo "🚀 Starting Docker container (using existing image)..."
    
    # .env から STRIPE_SECRET_KEY を取得 (引用符を削除)
    STRIPE_KEY=$(grep "^STRIPE_SECRET_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

    # 開発環境のみホスト側で Stripe CLI を起動
    if grep -q "NODE_ENV=development" .env && command -v stripe &> /dev/null && [ -n "$STRIPE_KEY" ]; then
      echo "🛠️  Starting Stripe CLI forwarding with API key from .env..."
      stripe listen --api-key "$STRIPE_KEY" --forward-to localhost:3000/api/stripe-webhook &
    elif grep -q "NODE_ENV=development" .env && command -v stripe &> /dev/null; then
      echo "🛠️  Starting Stripe CLI with default auth..."
      stripe listen --forward-to localhost:3000/api/stripe-webhook &
    fi

    docker compose up -d
    echo "✅ App is starting at http://localhost:3000"
    ;;
  build)
    echo "🏗️ Building Docker image..."
    docker compose build
    echo "✅ Build complete."
    ;;
  up)
    if [ ! -f .env ]; then
      echo "Error: .env file not found."
      exit 1
    fi
    echo "🚀 Building and starting Docker container..."

    # .env から STRIPE_SECRET_KEY を取得 (引用符を削除)
    STRIPE_KEY=$(grep "^STRIPE_SECRET_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

    # 開発環境のみホスト側で Stripe CLI を起動
    if grep -q "NODE_ENV=development" .env && command -v stripe &> /dev/null && [ -n "$STRIPE_KEY" ]; then
      echo "🛠️  Starting Stripe CLI forwarding with API key from .env..."
      stripe listen --api-key "$STRIPE_KEY" --forward-to localhost:3000/api/stripe-webhook &
    elif grep -q "NODE_ENV=development" .env && command -v stripe &> /dev/null; then
      echo "🛠️  Starting Stripe CLI with default auth..."
      stripe listen --forward-to localhost:3000/api/stripe-webhook &
    fi

    docker compose up --build -d
    echo "✅ App is starting at http://localhost:3000"
    ;;
  stop)
    echo "🛑 Stopping and removing Docker containers..."
    docker compose down
    pkill -f "stripe listen"
    echo "✅ Stopped (including Stripe CLI)."
    ;;
  restart)
    echo "🔄 Restarting Docker containers..."
    docker compose restart
    echo "✅ Restart complete."
    ;;
  *)
    echo "Usage: $0 {start|build|up|stop|restart}"
    echo "  start   : Start containers using existing images."
    echo "  build   : Build or rebuild images."
    echo "  up      : Build and start containers."
    echo "  stop    : Stop and remove containers."
    echo "  restart : Restart existing containers."
    exit 1
    ;;
esac
