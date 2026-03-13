#!/bin/bash

COMMAND=$1

stop_dev() {
  echo "🛑 Stopping development servers (Vite and Express)..."
  pkill -f "vite --host 0.0.0.0"
  pkill -f "tsx watch src/server/index.ts"
  echo "✅ Development servers stopped."
}

case $COMMAND in
  start)
    if [ ! -d node_modules ]; then
      echo "📦 Installing dependencies..."
      npm install
    fi
    echo "🚀 Starting development environment..."
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
