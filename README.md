# 化疗血常规追踪器 - 前端

这是化疗血常规追踪器应用的前端部分，使用 React + TypeScript 构建。

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **React Router** - 路由管理
- **Axios** - HTTP 客户端
- **Chart.js** - 数据可视化
- **ESLint + Prettier** - 代码质量和格式化

## 项目结构

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── assets/         # 图片、字体等资源
│   ├── components/     # 可复用组件
│   │   ├── auth/       # 认证相关组件
│   │   ├── bloodTest/  # 血常规相关组件
│   │   ├── biochem/    # 生化检查组件
│   │   ├── charts/     # 图表组件
│   │   ├── chemoCycle/ # 化疗周期组件
│   │   ├── common/     # 通用组件
│   │   ├── Layout/     # 布局组件
│   │   └── reminders/  # 提醒组件
│   ├── context/        # React Context
│   │   └── AuthContext.tsx  # 认证状态管理
│   ├── hooks/          # 自定义 Hooks
│   ├── pages/          # 页面组件
│   │   ├── auth/            # 登录/注册/找回密码
│   │   ├── dashboard/       # 仪表板
│   │   ├── bloodTests/      # 血常规记录页面
│   │   ├── biochemTests/    # 生化检查页面
│   │   ├── chemoCycles/     # 化疗周期页面
│   │   ├── Analytics/       # 数据分析页面
│   │   ├── reminders/       # 提醒页面
│   │   ├── settings/       # 设置页面
│   │   └── share/           # 只读分享查看页
│   ├── services/       # API 服务
│   │   ├── api/        # API 客户端
│   │   └── auth/       # 认证服务
│   ├── types/          # TypeScript 类型定义
│   ├── utils/          # 工具函数
│   ├── App.tsx         # 主应用组件
│   └── index.tsx       # 应用入口
├── .eslintrc.json      # ESLint 配置
├── .prettierrc         # Prettier 配置
├── tsconfig.json       # TypeScript 配置
└── package.json        # 项目依赖
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm start
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `build/` 目录。

### 运行测试

```bash
npm test
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 自动修复 ESLint 问题
npm run lint:fix

# 格式化代码
npm run format
```

## 环境变量

创建 `.env` 文件配置环境变量：

```
REACT_APP_API_URL=http://localhost:5000/api
```

## 路径别名

项目配置了路径别名，可以使用 `@/` 前缀导入模块：

```typescript
import { User } from '@/types';
import apiClient from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
```

## 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用函数式组件和 Hooks
- 使用 CSS Modules 或独立 CSS 文件管理样式

## 主要功能模块

### 认证系统
- 用户登录/注册
- JWT 令牌管理
- 受保护路由

### 血常规管理
- 记录血常规数据
- 查看历史记录
- 数据验证和警告

### 化疗周期管理
- 创建和管理化疗周期
- 关联血常规数据

### 数据可视化
- 时间序列图表
- 趋势分析
- 数据导出

### 提醒系统
- 创建提醒
- 通知管理

### 生化检查（肝肾功能 + 电解质）
- 25 项指标（肝功能 15 + 肾功能 4 + 电解质 5 + LDH）
- 异常自动检测（pre-save hook 对照正常范围）
- 按日期自动关联化疗周期
- CSV 导出

### 数据共享
- 生成只读分享链接（可选 PIN 码保护）
- 一键撤销
- 受分享者无需登录即可查看血常规/生化/周期/分析

### PWA 离线支持
- Service Worker 缓存应用外壳
- API GET 网络优先、静态资源缓存优先
- 离线指示器

### 国际化 (i18n)
- 中文（默认）+ English
- 12 个命名空间，语言即时切换
- 后端错误码本地化

### 安全审计
- 登录/登出/改密/删账户/分享创建撤销等审计日志
- 异常登录检测（新设备/异地）
- 90 天 TTL 自动清理

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 许可证

私有项目
