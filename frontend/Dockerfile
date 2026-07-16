# ---- 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 后端地址通过构建参数注入；同源相对路径 /api，由本镜像 nginx 反代到 backend:5000
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# ---- 运行阶段：nginx 托管静态文件 ----
FROM nginx:alpine AS runner

# SPA 路由 fallback 配置（所有未知路径回退到 index.html，让 React Router 接管）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
