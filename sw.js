/**
 * Service Worker — Las Paellas de Ana
 *
 * Service worker mínimo: necesario para que la web sea instalable como PWA
 * en Chrome/Edge/Samsung/Opera. Cachea la shell para carga rápida offline
 * pero NO cachea los productos ni los ajustes (siempre desde Supabase).
 */

const CACHE_VERSION = 'lpda-v3';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const SHELL_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/config.js',
    '/assets/js/supabase-client.js',
    '/manifest.json',
    '/assets/icon.svg',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/assets/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => Promise.all(
            names.filter((n) => n !== SHELL_CACHE && n.startsWith('lpda-'))
                 .map((n) => caches.delete(n))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Nunca interceptamos llamadas a Supabase ni Google Maps: siempre red.
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('google.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('vercel.live')
    ) {
        return;
    }

    // Shell: network-first con fallback a cache.
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cachea solo respuestas OK de mismo origen.
                if (response && response.ok && url.origin === self.location.origin) {
                    const clone = response.clone();
                    caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
                }
                return response;
            })
            .catch(() => caches.match(request).then((hit) => hit || caches.match('/index.html')))
    );
});
