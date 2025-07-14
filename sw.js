// Define un nombre para el caché actual. Cámbialo si actualizas los archivos.
const CACHE_NAME = 'informe-riesgo-cache-v1';

// Lista de archivos que se guardarán en el caché para que la app funcione sin conexión.
const urlsToCache = [
  '/',
  'index.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Evento 'install': Se dispara cuando el Service Worker se instala.
// Aquí abrimos el caché y guardamos nuestros archivos.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la app solicita un recurso (una imagen, un script, etc.).
// Revisamos si el recurso está en el caché. Si está, lo entregamos desde ahí. Si no, lo buscamos en la red.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos una respuesta en el caché, la retornamos
        if (response) {
          return response;
        }
        // Si no, vamos a la red a buscarlo
        return fetch(event.request);
      }
    )
  );
});

// Evento 'activate': Se dispara cuando el Service Worker se activa.
// Aquí se pueden limpiar cachés viejos si creamos una nueva versión.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});