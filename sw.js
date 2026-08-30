// 词根词缀 PWA Service Worker
// 缓存核心资源，支持离线打开与「添加到主屏幕」。
// 导航请求采用网络优先，确保内容更新（如新增左侧目录）立即可见；
// 其它静态资源缓存优先，以支持离线打开。
// 更新内容时修改 CACHE 版本号即可触发更新。
const CACHE = 'roots-pwa-v13';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'supabase.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  // 页面导航：网络优先，保证每次打开都拿到最新页面（含目录更新）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => caches.match(req).then(c => c || caches.match('./')))
    );
    return;
  }
  // 其它静态资源：缓存优先，离线可用
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
