// Cache dinâmico baseado em timestamp para forçar atualização a cada deploy
const CACHE_NAME = `ubs-pereiro-cache-${new Date().getTime()}`;
const STATIC_CACHE = 'ubs-pereiro-static-v1';

// Instalando o service worker
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata do SW novo
  console.log('[SW] Installing service worker...');
});

// Ativando o service worker e limpando caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove todos os caches antigos
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim(); // assume controle imediato
    })
  );
});

// Estratégia: Network First para HTML, Cache First para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network first para documentos HTML (sempre busca versão mais recente)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache first para assets estáticos (JS, CSS, imagens)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Para tudo mais: Network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
