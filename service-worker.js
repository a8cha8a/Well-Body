// Build inserts a content-addressed release; source is not a deployable worker.
const RELEASE=__WB_RELEASE__;
const ASSETS=__WB_ASSETS__;
const CACHE_NAME='well-body-release-'+RELEASE;
const READY='./.well-body-ready';
const absolute=url=>new URL(url,self.registration.scope).href;
async function verified(response,asset){
 if(!response||!response.ok)throw Error('Missing release asset');
 const bytes=await response.clone().arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==asset.sha)throw Error('Mixed release assets');
 return response;
}
let preparation;
function prepare(force=false){
 if(preparation)return preparation;
 preparation=(async()=>{
  const cache=await caches.open(CACHE_NAME);
  if(!force&&await cache.match(absolute(READY)))return;
  try{
   const responses=await Promise.all(ASSETS.map(async asset=>verified(await fetch(absolute(asset.url),{cache:'no-store'}),asset)));
   for(let i=0;i<ASSETS.length;i++)await cache.put(absolute(ASSETS[i].url),responses[i]);
   await cache.put(absolute(READY),new Response(RELEASE));
  }catch(error){await caches.delete(CACHE_NAME);throw error;}
 })().finally(()=>{preparation=null;});
 return preparation;
}
self.addEventListener('install',event=>{
 event.waitUntil(prepare());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  if(!await cache.match(absolute(READY)))throw Error('Incomplete release');
  // Keep previous releases during migration; never clear site data or claim pages.
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==new URL(self.registration.scope).origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  if(!await cache.match(absolute(READY))){
   try{await prepare();}catch(error){return new Response('更新ファイルを確認できません。通信を確認して再読み込みしてください。サイトデータは消去しないでください。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
  }
  const asset=event.request.mode==='navigate'?ASSETS.find(a=>a.name==='index.html'):ASSETS.find(a=>absolute(a.url)===url.href);
  if(!asset)return new Response('この版のファイルは利用できません。',{status:503});
  try{return await verified(await cache.match(absolute(asset.url)),asset);}
  catch(error){
   // Repair only with the exact expected hashes; never substitute another release.
   try{await prepare(true);return await verified(await (await caches.open(CACHE_NAME)).match(absolute(asset.url)),asset);}
   catch(error){return new Response('更新ファイルが不足しています。通信を確認して再読み込みしてください。サイトデータは消去しないでください。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
  }
 })());
});
