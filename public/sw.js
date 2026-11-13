self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(clients.claim()));
self.addEventListener("fetch",e=>{
  if(e.request.method==="GET")e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
self.addEventListener("push",e=>{
  const d=e.data?.json()||{};
  e.waitUntil(self.registration.showNotification(d.title||"Correos",{body:d.body||"Tienes una actualización",icon:"icon-192.png"}));
});
