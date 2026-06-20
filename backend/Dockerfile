# ---- 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 先复制 package 文件，利用 Docker 层缓存
COPY package*.json ./
RUN npm ci

# 复制源码 + tsconfig，编译到 dist/
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 只装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 复制编译产物
COPY --from=builder /app/dist ./dist

# 非 root 用户运行
USER node

EXPOSE 5000
CMD ["node", "dist/server.js"]
