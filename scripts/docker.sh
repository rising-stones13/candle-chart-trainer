#!/bin/bash

COMMAND=$1

case $COMMAND in
  start)
    if [ ! -f .env ]; then
      echo "Error: .env file not found."
      exit 1
    fi
    echo "🚀 Starting Docker container (using existing image)..."
    docker compose up -d
    echo "✅ App is starting at http://localhost:3006"
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
    docker compose up --build -d
    echo "✅ App is starting at http://localhost:3006"
    ;;
  stop)
    echo "🛑 Stopping and removing Docker containers..."
    docker compose down
    echo "✅ Stopped."
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
