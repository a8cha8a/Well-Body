import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=data=>createHash('sha256').update(data).digest('hex');
export async function buildPwa(root,out,foodMaster){
 const source=await readFile(join(root,'index.html'),'utf8');
 const start=source.indexOf('<script src="calculations.js"></script>');
 const appStart=source.indexOf('let plan=',start),appEnd=source.indexOf('</script>',appStart);
 if(start<0||appStart<0||appEnd<0)throw Error('Unknown application template');
 const boot=await readFile(join(root,'pwa-boot.js'),'utf8');
 const worker=await readFile(join(root,'service-worker.js'),'utf8');
 const entries=[];
 for(const name of ['calculations.js','storage.js','models.js','app.js','manifest.webmanifest','food-master.json']){
  const content=name==='app.js'?Buffer.from(source.slice(appStart,appEnd)):name==='food-master.json'?(foodMaster||await readFile(join(root,'data/mext/food-master.json'))):await readFile(join(root,name));
  const sha=hash(content),extension=name.slice(name.lastIndexOf('.'));
  entries.push({name,url:'./assets/'+name.slice(0,name.lastIndexOf('.'))+'.'+sha+extension,sha,content});
 }
 const release=hash(source+boot+worker+entries.map(e=>e.sha).join(''));
 const metadata=entries.map(({name,url,sha})=>({name,url,sha}));
 let html=source.slice(0,start)+'<script>window.WB_RELEASE='+JSON.stringify({id:release,assets:metadata})+';\n'+boot+'</script>\n</body>\n</html>\n';
 html=html.replace('href="./manifest.webmanifest"','href="'+entries.find(e=>e.name==='manifest.webmanifest').url+'"');
 html=html.replace(/<button\b/g,'<button disabled');
 const assets=[...metadata,{name:'index.html',url:'./index.html',sha:hash(html)}];
 const builtWorker=worker.replace('__WB_RELEASE__',JSON.stringify(release)).replace('__WB_ASSETS__',JSON.stringify(assets));
 await rm(out,{recursive:true,force:true});await mkdir(join(out,'assets'),{recursive:true});
 for(const e of entries)await writeFile(join(out,e.url.slice(2)),e.content);
 await writeFile(join(out,'index.html'),html);await writeFile(join(out,'service-worker.js'),builtWorker);
 await writeFile(join(out,'release.json'),JSON.stringify({id:release,assets},null,2));
 return {id:release,assets};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const release=await buildPwa(process.cwd(),join(process.cwd(),'dist'));
 console.log('Verified PWA release: '+release.id);
}
