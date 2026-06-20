# 部署指南

本文档说明化疗血常规追踪器的两种运行方式：本地 Docker 一键起 / 生产部署。

## CI（GitHub Actions）

`.github/workflows/ci.yml` 在每次 push 到 `main` 或 PR 到 `main` 时触发，并行跑两个 job：

- **backend**：`tsc --noEmit` + `npm run contract:check` + `jest`
- **frontend**：`tsc --noEmit` + `npm run lint` + `react-scripts test`

PR 必须两个 job 都绿才能合并。

## 本地 Docker 一键启动（推荐）

需要先安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

```bash
# 在项目根目录
docker compose up --build
```

启动后：
- 前端：http://localhost:3000
- 后端：http://localhost:5000
- MongoDB：localhost:27017（数据持久化到 `mongo_data` volume）

按 `Ctrl+C` 停止。完全清理（含数据）：

```bash
docker compose down -v
```

## 生产部署

### 1. 准备环境变量

在部署机器上创建 `.env`（与 docker-compose.yml 同目录）：

```env
JWT_SECRET=<至少16字符的随机串>
JWT_REFRESH_SECRET=<另一个至少16字符的随机串>
FRONTEND_URL=https://你的生产域名
REACT_APP_API_URL=https://你的生产域名/api
```

生成随机 secret：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠ `JWT_SECRET` 在生产环境必须显式设置，否则 `secrets.ts` 会让进程启动失败（L-P7 的安全加固）。
> ⚠ `FRONTEND_URL` 决定分享链接的 URL（M-P4），生产必须配成真实域名，否则链接指向 localhost。

### 2. 构建并启动

```bash
docker compose --env-file .env up --build -d
```

`-d` 后台运行。查看日志：
```bash
docker compose logs -f backend
```

### 3. 反向代理（推荐）

生产通常在前面前面再加一层 nginx/Caddy 做 HTTPS 终止 + 域名路由：
- `你的域名/` → frontend 容器（3000→80）
- `你的域名/api` → backend 容器（5000）

这部分按你的实际域名和证书情况配置，不在本项目范围内。

## 架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  frontend   │     │  backend    │     │   mongo     │
│  (nginx:80) │ ──> │ (node:5000) │ ──> │ (mongo:27017)│
│  静态文件    │ API  │  Express    │     │  数据持久化  │
└─────────────┘     └─────────────┘     └─────────────┘
    宿主:3000          宿主:5000           宿主:27017
```

- **frontend**：多阶段构建，`npm run build` 产出静态文件，nginx 托管 + SPA 路由 fallback
- **backend**：多阶段构建，`tsc` 编译到 `dist/`，生产只装生产依赖，非 root 用户运行
- **mongo**：官方 `mongo:7` 镜像，带 healthcheck，backend 等 mongo 健康后才启动
