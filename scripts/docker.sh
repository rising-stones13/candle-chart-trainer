#!/bin/bash

COMMAND=$1

case $COMMAND in
  start)
    if [ ! -f .env ]; then
      echo "Error: .env file not found."
      exit 1
    fi
    echo "🚀 Building and starting Docker container..."
    docker compose up --build -d
    echo "✅ App is starting at http://localhost:3002"
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
    echo "Usage: $0 {start|stop|restart}"
    exit 1
    ;;
esac
