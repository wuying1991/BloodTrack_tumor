# 化疗血常规追踪器 - 前端

这是化疗血常规追踪器应用的前端部分，使用 React + TypeScript 构建，帮助化疗患者追踪血常规指标变化。

## 技术栈

- **React 18** + **TypeScript** — UI 框架
- **React Router v6** — 路由管理（ProtectedRoute + PublicOnlyRoute）
- **Axios** — HTTP 客户端（自动 Token 刷新）
- **Chart.js** + **react-chartjs-2** — 数据可视化
- **ESLint + Prettier** — 代码质量

## 项目结构

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── auth/          # ProtectedRoute, PublicOnlyRoute
│   │   ├── bloodTest/     # BloodTestForm, BloodTestList
│   │   └── Layout/        # Layout (侧边栏导航+登出)
│   ├── context/
│   │   └── AuthContext.tsx # 认证状态管理 (JWT 双Token自动刷新)
│   ├── pages/
│   │   ├── auth/          # Login, Register, ForgotPassword, ResetPassword
│   │   ├── dashboard/     # Dashboard (概览卡片+最近记录) + 单元测试
│   │   ├── bloodTests/    # BloodTests (CRUD 完整)
│   │   ├── chemoCycles/   # ChemoCycles (CRUD 完整) + 单元测试
│   │   ├── Analytics/     # Analytics (趋势图表+摘要)
│   │   └── settings/      # Settings (个人资料/通知/隐私)
│   ├── services/
│   │   ├── api/           # ApiClient (Axios + 拦截器)
│   │   ├── auth/          # AuthService
│   │   ├── bloodTest/     # BloodTestService
│   │   ├── chemoCycle/    # ChemoCycleService
│   │   └── analytics/     # AnalyticsService
│   ├── types/
│   │   └── index.ts       # 类型定义 (与 contracts/ 对齐)
│   └── App.tsx            # 路由配置
```

## 页面状态

| 页面 | 路径 | 状态 | 测试 |
|------|------|------|------|
| 登录 | `/login` | ✅ 完成 | - |
| 注册 | `/register` | ✅ 完成 | - |
| 忘记密码 | `/forgot-password` | ✅ 完成 | - |
| 重置密码 | `/reset-password` | ✅ 完成 | - |
| 仪表板 | `/dashboard` | ✅ 完成 | 10 单元测试 |
| 血常规 | `/blood-tests` | ✅ 完成 | - |
| 化疗周期 | `/chemo-cycles` | ✅ 完成 | 12 单元测试 |
| 数据分析 | `/analytics` | ✅ 完成 | - |
| 设置 | `/settings` | ✅ 完成 | - |

## 开始使用

```bash
npm install
npm start          # http://localhost:3000
npm run build      # 生产构建 → build/
npm test           # 运行测试
npm run lint       # ESLint 检查
npm run lint:fix   # ESLint 自动修复
```

## 环境变量

```
REACT_APP_API_URL=http://localhost:5000/api
```

## 特性亮点

- **JWT 双 Token 机制** — Access Token 15分钟 + Refresh Token 7天，自动无感刷新
- **30分钟无操作自动登出** — AuthContext 内建
- **密码重置流** — 完整 forgot/reset 流程
- **数据契约一致性** — 前后端类型与 [contracts/index.ts](../contracts/index.ts) 对齐，CI 自动校验
- **Chart.js 趋势图** — 4 项血液指标独立时间序列图，带标签切换
