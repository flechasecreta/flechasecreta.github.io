// Guarda a moldura do app para abrir rápido; os dados sempre vêm da rede quando possível.
const VERSAO = 'painel-cbic-v2';
const MOLDURA = ['./', 'index.html', 'app.css', 'app.js', 'fonte.js', 'manifest.webmanifest', 'icone-192.png', 'cbic-logo-completo.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(MOLDURA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSAO).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
