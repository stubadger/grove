/* Grove offline support (a service worker). Only used on the published site, not when opened from disk.

   Rule: always try the network first, so a new version shows up straight away. If the network fails or
   takes more than a few seconds, answer from the copy kept on the device. Every successful answer
   refreshes that copy. Requests that send data (sync) are never touched.

   FILES is fetched when this is first installed, so the app works offline even before every page has
   been visited. Add any new file the app loads to this list. */
var CACHE = 'grove-2';
var FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png',
  'js/config.js', 'js/core.js', 'js/sync.js', 'js/charts.js', 'js/plants.js', 'js/scene.js', 'js/extras.js', 'js/pages-more.js', 'js/stats.js', 'js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url), own = url.origin === self.location.origin, font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!own && !font) return;
  var kept = function () { return caches.match(req, { ignoreSearch: own }); };
  e.respondWith(new Promise(function (resolve) {
    var settled = false, finish = function (res) { if (!settled && res) { settled = true; resolve(res); } };
    var slow = setTimeout(function () { kept().then(finish); }, 3000);
    fetch(req).then(function (res) {
      clearTimeout(slow);
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      finish(res);
    }).catch(function () {
      clearTimeout(slow);
      kept().then(function (hit) { finish(hit || Response.error()); });
    });
  }));
});
