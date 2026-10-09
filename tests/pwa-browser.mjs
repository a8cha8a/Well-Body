// Synthetic records only. Localhost is a secure context; no production URLs.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildPwa} from '../scripts/build-pwa.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve('.'),folder=await mkdtemp(join(tmpdir(),'well-body-browser-'));
const release=await buildPwa(root,folder,Buffer.from('{"foods":[]}'));
const oldRef='38f0d3ab1415deda98269a8ad56be23ad5becd38';
const old=new Map(['index.html','storage.js','models.js','calculations.js','manifest.webmanifest','service-worker.js'].map(name=>[name,execFileSync('git',['show',oldRef+':'+name])]));old.set('data/mext/food-master.json',Buffer.from('{"foods":[]}'));
let phase='old',badAsset=null;
const server=createServer(async(req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
 try{
  let content=phase==='old'?old.get(name):await readFile(join(folder,name));
  if(!content)throw Error('missing');if(badAsset&&name===badAsset)content=Buffer.from('OLD_SCRIPT_OR_HTML');
  res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':'text/html','Cache-Control':'no-store'});res.end(content);
 }catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,...(process.env.WB_CHROMIUM_PATH?{executablePath:process.env.WB_CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu']}: {})});
let passed=0;
const snapshot=page=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('wellBody')))));
try{
 const context=await browser.newContext();let page=await context.newPage();
 await page.goto(base);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await page.evaluate(async()=>{localStorage.setItem('wellBodyPlan',JSON.stringify({sex:'male',age:40,height:175,startWeight:80,goalWeight:72,activity:1.2,startDate:'2020-01-01',goalDate:'2020-12-31'}));localStorage.setItem('wellBodyWeightRecords','[{"date":"2020-01-01","weight":80}]');localStorage.setItem('wellBodyMeals','[]');localStorage.setItem('wellBodyCustomDishes','[]');await caches.open('other-app-cache');});
 const before=await snapshot(page);phase='new';await page.goto(base);
 await page.waitForFunction(()=>window.WellBodyRelease?.scriptsReady&&window.WellBodyRelease.foodReady);
 assert.equal(await snapshot(page),before);passed++;console.log('PASS P01/P08: real old worker + new HTML, all four data keys unchanged');
 await page.fill('#recordWeight','79.3');await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
 assert.equal(await page.inputValue('#recordWeight'),'79.3');assert.equal(await snapshot(page),before);passed++;console.log('PASS P06/P07: update waits, input and unrelated cache retained');
 assert.ok(await page.evaluate(async()=>(await caches.keys()).includes('other-app-cache')));
 await page.close();page=await context.newPage();await page.goto(base);
 await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'&&!r.waiting;});
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.WellBodyRelease?.scriptsReady&&window.WellBodyRelease.foodReady);
 assert.equal(await snapshot(page),before);passed++;console.log('PASS P04/P05: new worker offline startup, retained data');
 await page.fill('#recordDate','2020-01-02');await page.fill('#recordWeight','79');await page.click('button:has-text("体重を記録")');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.wellBodyWeightRecords).length),2);passed++;console.log('PASS P08/P10: offline actual weight save');
 const saved=await snapshot(page),storage=release.assets.find(a=>a.name==='storage.js');
 await page.evaluate(async({id,url})=>{const cache=await caches.open('well-body-release-'+id);await cache.delete(new URL(url,location.href).href);},{id:release.id,url:storage.url});
 await page.reload();await page.waitForFunction(()=>document.getElementById('pwaMessage').textContent.includes('保存・削除'));
 assert.equal(await snapshot(page),saved);assert.equal(await page.locator('button').first().isDisabled(),true);passed++;console.log('PASS P05: missing required script offline safely stops all saves');
 await context.setOffline(false);await page.reload();await page.waitForFunction(()=>window.WellBodyRelease?.scriptsReady&&window.WellBodyRelease.foodReady);assert.equal(await snapshot(page),saved);passed++;console.log('PASS: exact-release repair after reconnect');
 await context.close();
 const mealContext=await browser.newContext(),mealPage=await mealContext.newPage();
 await mealPage.goto(base);await mealPage.waitForFunction(()=>window.WellBodyRelease?.scriptsReady&&window.WellBodyRelease.foodReady);
 await mealPage.fill('#voiceText','白米');await mealPage.click('#voiceButton');await mealPage.click('button:has-text("食事を追加")');
 assert.match(await mealPage.locator('#mealInputMessage').innerText(),/未解決/);assert.equal(await mealPage.evaluate(()=>localStorage.getItem('wellBodyMeals')),null);
 await mealPage.fill('#voiceText','');assert.equal(await mealPage.locator('#mealInputMessage').innerText(),'');assert.equal(await mealPage.locator('#selectedFoodMessage').innerText(),'食品を選択してください。');
 await mealPage.selectOption('#foodSelect','rice');await mealPage.fill('#foodGrams','100');await mealPage.click('button:has-text("食事を追加")');
 assert.equal(await mealPage.evaluate(()=>JSON.parse(localStorage.wellBodyMeals).length),1);passed++;console.log('PASS meal: missing grams blocks, empty text restores real manual save');
 await mealPage.selectOption('#foodSelect',[]);assert.equal(await mealPage.locator('#selectedFoodMessage').innerText(),'食品を選択してください。');
 const mealSaved=await snapshot(mealPage);
 for(const text of ['白米100gと未知料理100g','白米100gと納豆']){
  await mealPage.fill('#voiceText',text);await mealPage.click('#voiceButton');await mealPage.selectOption('#foodSelect','rice');await mealPage.fill('#foodGrams','100');await mealPage.click('button:has-text("食事を追加")');assert.equal(await snapshot(mealPage),mealSaved);assert.match(await mealPage.locator('#mealInputMessage').innerText(),/未解決/);
 }
 passed++;console.log('PASS meal: unresolved single/multiple foods cannot bypass saving by manual selection');
 await mealPage.fill('#voiceText','白米100g');await mealPage.click('#voiceButton');assert.equal(await mealPage.locator('#mealInputMessage').innerText(),'');
 await mealPage.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated';});
 await mealPage.reload();await mealPage.waitForFunction(()=>window.WellBodyRelease?.scriptsReady&&window.WellBodyRelease.foodReady);
 await mealContext.setOffline(true);await mealPage.fill('#voiceText','白米100g');await mealPage.click('#voiceButton');await mealPage.click('button:has-text("食事を追加")');assert.equal(await mealPage.evaluate(()=>JSON.parse(localStorage.wellBodyMeals).length),2);
 passed++;console.log('PASS meal: corrected parsing clears warning, actual offline save succeeds');await mealContext.close();
 const mixed=await browser.newContext();const p=await mixed.newPage();badAsset=storage.url.slice(2);await p.goto(base);await p.waitForFunction(()=>document.getElementById('pwaMessage').textContent.includes('保存・削除'));assert.equal(await p.evaluate(()=>localStorage.length),0);assert.equal(await p.locator('button').first().isDisabled(),true);passed++;console.log('PASS P02/P03: old script bytes reject startup and incomplete worker cache');await mixed.close();
 console.log('Browser checks: '+passed+' passed, 0 failed');
}finally{await browser.close();await new Promise(r=>server.close(r));await rm(folder,{recursive:true,force:true});}
