var GHPATH = '/letter-guesser-nn';

var APP_PREFIX = 'lgnn_';

var VERSION = 'version_00';

var URLS = [
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/css/style.css`,
  `${GHPATH}/js/script.js`
  `${GHPATH}/assets/model/model.json`,
  `${GHPATH}/assets/model/group1-shard1of10.bin`,
  `${GHPATH}/assets/model/group1-shard2of10.bin`,
  `${GHPATH}/assets/model/group1-shard3of10.bin`,
  `${GHPATH}/assets/model/group1-shard4of10.bin`,
  `${GHPATH}/assets/model/group1-shard5of10.bin`,
  `${GHPATH}/assets/model/group1-shard6of10.bin`,
  `${GHPATH}/assets/model/group1-shard7of10.bin`,
  `${GHPATH}/assets/model/group1-shard8of10.bin`,
  `${GHPATH}/assets/model/group1-shard9of10.bin`,
  `${GHPATH}/assets/model/group1-shard10of10.bin`,
  `${GHPATH}/assets/imgs/logo.png`
]


self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});