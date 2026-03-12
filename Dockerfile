# ビルドステージ
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 実行ステージ
FROM node:20-slim AS production-stage
WORKDIR /app
COPY package*.json ./
RUN npm install --production
# dist ディレクトリ全体をコピー
COPY --from=build-stage /app/dist ./dist
# src/lib も必要 (firebase-admin.js などが参照している可能性があるため)
COPY --from=build-stage /app/src/lib ./src/lib

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

# ビルドされたサーバーの起動
CMD ["node", "dist/server/server/index.js"]
