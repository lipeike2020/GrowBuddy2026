self.addEventListener('message', event => {
 if (event.data?.type === 'GROWBUDDY_CLIENTS') event.waitUntil(
  self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
   event.ports[0]?.postMessage({count:clients.filter(client => client.url.startsWith(self.registration.scope)).length});
  })
 );
});
