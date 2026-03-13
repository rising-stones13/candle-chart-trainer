#!/bin/bash

echo "🛑 Stopping development servers (Vite and Express)..."

# Vite と tsx watch のプロセスを終了させる
pkill -f "vite --host 0.0.0.0"
pkill -f "tsx watch src/server/index.ts"

echo "✅ Development servers stopped."
