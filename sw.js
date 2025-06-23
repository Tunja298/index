const CACHE_NAME = 'pilana-frivanto-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-192x192-maskable.png',
  '/icon-512x512-maskable.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker: Cached all files successfully');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.log('Service Worker: Error caching files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // If we have a cached version, return it
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise, fetch from network
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(function(response) {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it can only be consumed once
            var responseToCache = response.clone();

            // Add successful responses to cache
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(function(error) {
            console.log('Service Worker: Fetch failed, serving offline page:', error);
            
            // If the request is for a page, return a basic offline message
            if (event.request.destination === 'document') {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>Pilana Frivanto - Offline</title>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      text-align: center;
                      padding: 50px;
                      background: linear-gradient(135deg, #2c2c2c, #3d3d3d);
                      color: white;
                      margin: 0;
                      min-height: 100vh;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                    }
                    .offline-content {
                      max-width: 400px;
                      background: rgba(255,255,255,0.1);
                      padding: 30px;
                      border-radius: 15px;
                      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
                    p { font-size: 1.2rem; margin-bottom: 1.5rem; }
                    button {
                      background: #28a745;
                      color: white;
                      border: none;
                      padding: 12px 24px;
                      border-radius: 8px;
                      font-size: 1rem;
                      cursor: pointer;
                    }
                  </style>
                </head>
                <body>
                  <div class="offline-content">
                    <h1>🌲 PILANA FRIVANTO</h1>
                    <h2>📱 Offline Režim</h2>
                    <p>Trenutno niste povezani na internet. Aplikacija će se pokrenuti čim se veza obnovi.</p>
                    <button onclick="window.location.reload()">🔄 Pokušaj Ponovno</button>
                  </div>
                  <script>
                    // Auto-reload when online
                    window.addEventListener('online', function() {
                      window.location.reload();
                    });
                  </script>
                </body>
                </html>`,
                {
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                  }
                }
              );
            }
          });
      })
  );
});

// Background sync for offline data storage
self.addEventListener('sync', function(event) {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  console.log('Service Worker: Performing background sync');
  // Here you can sync offline data when connection is restored
  return Promise.resolve();
}

// Handle messages from main thread
self.addEventListener('message', function(event) {
  console.log('Service Worker: Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Notification click handling (if you add push notifications later)
self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Push message handling (for future push notifications)
self.addEventListener('push', function(event) {
  console.log('Service Worker: Push message received');
  
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('Pilana Frivanto', options)
    );
  }
});