// Embedded in HTML by the build; not fetched through an old script URL.
(()=>{
 const release=window.WB_RELEASE;
 const state={scriptsReady:false,foodReady:false};
 window.WellBodyRelease=state;
 const message=text=>{document.getElementById('pwaMessage').textContent=text;};
 const recovery='入力中の内容を控え、通信を確認してから再読み込みしてください。サイトデータの消去や初期化はしないでください。';
 async function verified(asset){
  const response=await fetch(asset.url,{cache:'no-store'});
  if(!response.ok)throw Error('Asset HTTP failure');
  const bytes=await response.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==asset.sha)throw Error('Asset release mismatch');
  return bytes;
 }
 state.fetchFood=async()=>{
  state.foodReady=false;
  const bytes=await verified(release.assets.find(a=>a.name==='food-master.json'));
  const master=JSON.parse(new TextDecoder().decode(bytes));
  if(!master||!Array.isArray(master.foods))throw Error('Invalid food master');
  state.foodReady=true;return master;
 };
 async function execute(bytes){
  const url=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'}));
  try{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}
  finally{URL.revokeObjectURL(url);}
 }
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(registration=>{
   const waiting=()=>{if(registration.waiting)message('更新の準備ができました。入力を保存した後、このアプリと同じサイトの画面を閉じて開き直してください。');};
   waiting();registration.addEventListener('updatefound',()=>{const installing=registration.installing;if(installing)installing.addEventListener('statechange',()=>{
    waiting();if(installing.state==='redundant')message('オフライン用の更新準備を完了できませんでした。'+recovery);
   });});
  }).catch(()=>message('オフライン用の更新確認を完了できませんでした。'+recovery));
 }
 (async()=>{
  try{
   const scripts=release.assets.filter(a=>a.name.endsWith('.js'));
   // Verify every script before executing any application code.
   const bytes=await Promise.all(scripts.map(verified));
   for(let i=0;i<bytes.length-1;i++)await execute(bytes[i]);
   const api=window.WellBodyStorage&&window.WellBodyStorage.create();
   if(!api||typeof api.canWrite!=='function'||typeof api.rejectRead!=='function'||!window.WellBodyModels||!window.WellBodyCalculations)throw Error('Missing application APIs');
   state.scriptsReady=true;
   await execute(bytes.at(-1));
   document.querySelectorAll('button').forEach(button=>button.disabled=false);
  }catch(error){
   state.scriptsReady=false;state.foodReady=false;
   document.querySelectorAll('button').forEach(button=>button.disabled=true);
   message('アプリのファイルを確認できないため、保存・削除を停止しています。'+recovery);
  }
 })();
})();
