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

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

# ビルドされたサーバーの起動
CMD ["node", "dist/server/index.js"]
