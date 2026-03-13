#!/bin/bash

# 停止
./scripts/stop-dev.sh

# 開始
echo "🔄 Restarting development servers..."
./scripts/start-dev.sh
