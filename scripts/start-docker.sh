#!/bin/bash

# .env ファイルの存在チェック
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create it first."
  exit 1
fi

echo "🚀 Building and starting Docker container..."
docker compose up --build -d

echo "✅ App is starting at http://localhost:3002"
echo "To view logs, run: docker compose logs -f"
