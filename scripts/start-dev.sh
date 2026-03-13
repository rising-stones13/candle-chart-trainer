#!/bin/bash

# .env ファイルの存在チェック
if [ ! -f .env ]; then
  echo "Warning: .env file not found. Development environment may not work correctly."
fi

# node_modules の存在チェック
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "🚀 Starting development environment (Vite + Express)..."
npm run dev
