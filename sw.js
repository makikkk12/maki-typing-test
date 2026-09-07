var CACHE_NAME = 'typing-test-v4';
var FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var url = event.request.url;

  if(url.indexOf('/.netlify/functions/') !== -1){
    event.respondWith(fetch(event.request));
    return;
  }

  var isPageRequest = event.request.mode === 'navigate' ||
    url.indexOf('index.html') !== -1 ||
    url.indexOf('manifest.json') !== -1 ||
    url.indexOf('sw.js') !== -1;

  if(isPageRequest){
    event.respondWith(
      fetch(event.request).then(function(response){
        if(response && response.ok){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function(){
        return caches.match(event.request).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        if(response && response.ok){
          return caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, response.clone());
            return response;
          });
        }
        return response;
      }).catch(function(){
        return caches.match('./index.html');
      });
    })
  );
});
