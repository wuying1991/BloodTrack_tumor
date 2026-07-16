# L-P1 PWA 离线支持 - 设计文档

> 状态：用户已确认设计
> 日期：2026-07-15
> 关联：DEVLOG.md L-P1，预估 3 天

---

## 1. 目标

让化疗血常规追踪器成为可安装的 PWA，离线时应用能打开并查看之前加载过的数据，但不能离线录入。

不在范围内：离线录入 + 同步、Workbox 预缓存、Push 通知、Background Sync。

---

## 2. 用户决策汇总

| # | 问题 | 决策 |
|---|---|---|
| Q1 | 离线能力 | 可安装 + 离线查看已缓存 API GET 数据；POST/PUT/DELETE 不缓存 |
| Q2 | SW 实现 | 自定义 `public/sw.js`，运行时缓存，零额外依赖 |
| Q3 | 离线指示器 | Layout 顶部全局条，联网隐藏，断网显示提示 |

---

## 3. Service Worker 设计

### 3.1 文件位置

`frontend/public/sw.js` -- CRA 构建时 `public/` 下的文件原样复制到 `build/`，无需改构建配置。

### 3.2 缓存策略

```js
const CACHE_NAME = 'bloodtrack-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

// install: 缓存 app shell 基础页
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

// activate: 清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch: 分流
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 只处理同源 GET 请求
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API GET: network-first，失败回退缓存
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // 缓存成功的 API 响应（clone，因为 response 是 stream）
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 静态资源: cache-first，回退网络
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
```

### 3.3 注册

`frontend/src/index.tsx` 末尾加：

```ts
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW 注册失败:', err));
  });
}
```

> 仅生产环境注册（CRA dev server 的 HMR 与 SW 冲突）。

---

## 4. Manifest 更新

`frontend/public/manifest.json` 需要：

- 补充 192x192 和 512x512 PNG 图标（PWA 安装必需）
- `start_url` 改为 `/`
- `display` 保持 `standalone`
- `theme_color` 和 `background_color` 与当前配色一致

由于没有设计图标源文件，原计划使用纯色占位 PNG（`public/logo192.png` 和 `public/logo512.png`）。

> **实际实现（2026-07-16 决策）**：改用单一 `public/icon.svg`（`sizes: "any"` + `purpose: "any maskable"`），manifest 中以 SVG 替代 PNG 192/512。理由：现代 Chrome 接受 SVG 图标即可满足可安装性，零额外二进制文件，且用户后续会替换为真实 logo。
> **已知取舍**：iOS Safari 对 SVG 图标支持较弱，Lighthouse PWA「可安装」审计倾向要求 PNG 192+512；若后续需要 iOS 安装或 Lighthouse 满分，再补两张占位 PNG。

---

## 5. 离线指示器

### 5.1 组件

`frontend/src/components/common/OfflineIndicator.tsx`（新增）：

```tsx
const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      ⚠️ 您当前处于离线状态，仅可查看已缓存的数据
    </div>
  );
};
```

### 5.2 嵌入 Layout

在 `Layout.tsx` 的 `<div className="layout">` 内、`<header>` 之前插入 `<OfflineIndicator />`。

### 5.3 样式

`.offline-indicator`：黄色背景（`#fff3cd`）、深色文字（`#856404`）、居中、`padding: 0.5rem`、`font-size: 0.9rem`。

---

## 6. 测试

### 后端
无变化（PWA 是纯前端）。

### 前端
- `OfflineIndicator.test.tsx`：联网时不渲染，断网时渲染提示文案
- 现有测试不破坏

### 手动验证
Docker 环境下：
1. 打开 http://localhost:3000，登录，浏览几个页面（触发 API GET 缓存）
2. F12 -> Application -> Service Workers 确认 SW 已注册
3. F12 -> Network -> 切到 Offline
4. 刷新页面 -> 应用仍能打开，已访问过的数据有缓存，未访问的显示错误
5. 顶部出现黄色离线提示条

---

## 7. 工作量预估

| 模块 | 估时 |
|---|---|
| `public/sw.js` + 注册 | 0.5 d |
| manifest 更新 + 图标 | 0.3 d |
| OfflineIndicator 组件 + Layout 嵌入 | 0.3 d |
| 前端测试 | 0.2 d |
| Docker 重建 + 手动验证 | 0.5 d |
| 门禁 + DEVLOG | 0.2 d |
| **总计** | **约 2 天**（比预估 3 天少，因为不涉及 Workbox 和离线同步） |
