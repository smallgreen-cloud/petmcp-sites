// Never persist health records, authenticated HTML or photos in browser caches.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="zh-Hant"><meta name="viewport" content="width=device-width"><title>PetMCP 離線</title><body style="font:20px system-ui;padding:2rem"><h1>目前離線</h1><p>連線後重新開啟手帳，才能顯示最新紀錄。</p><a href="/">重新連線</a></body></html>',{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})));});
