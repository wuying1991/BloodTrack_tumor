const CACHE_NAME = 'bloodtrack-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

// install: 缓存 app shell 基础页
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// activate: 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// fetch: 分流缓存策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只处理同源 GET 请求
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API GET: network-first，失败回退缓存（离线查看已加载数据）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 静态资源: cache-first，回退网络（含首次缓存）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
