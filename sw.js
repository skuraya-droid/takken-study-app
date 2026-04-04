const CACHE_NAME = 'takken-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// インストール時にキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // CDNやネットワークエラーの場合もスキップ
      });
    })
  );
  self.skipWaiting();
});

// アクティベート時に古いキャッシュ削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ネットワークファースト + キャッシュフォールバック
self.addEventListener('fetch', event => {
  // GETリクエストのみ
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // 200レスポンスのみキャッシュ
        if (!res || res.status !== 200 || res.type === 'error') {
          return res;
        }
        // キャッシュに追加（元のレスポンスは変更不可なのでクローン）
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, resClone);
        });
        return res;
      })
      .catch(() => {
        // オフライン時はキャッシュから取得
        return caches.match(event.request)
          .then(res => res || caches.match('/index.html'));
      })
  );
});
