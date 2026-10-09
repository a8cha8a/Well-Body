const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const storage=require('../../storage.js'),models=require('../../models.js'),calc=require('../../calculations.js');
const index=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const start=index.indexOf('let plan='),end=index.indexOf('</script>',start);
function node(){
 const n={value:'',children:[],style:{},className:'',width:520,height:260,listeners:{},classList:{toggle(){}},setAttribute(){},addEventListener(event,fn){this.listeners[event]=fn;},appendChild(child){this.children.push(child);return child;},replaceChildren(...children){this.children=children;},getContext(){return new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});}};
 let text='',html='';Object.defineProperty(n,'textContent',{get:()=>text,set:v=>text=String(v)});Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.children=[];}});return n;
}
function app(initial={},options={}){
 const data=new Map(Object.entries(initial)),failReads=new Set(options.failReads||[]),failWrites=new Set(),failRemoves=new Set();
 const calls={write:[],remove:[]};
 const backend={getItem:k=>{if(failReads.has(k))throw Error('synthetic read failure');return data.get(k)??null;},setItem(k,v){calls.write.push(k);if(failWrites.has(k))throw Error('synthetic write failure');data.set(k,v);},removeItem(k){calls.remove.push(k);if(failRemoves.has(k))throw Error('synthetic remove failure');data.delete(k);}};
 const nodes=new Proxy({}, {get:(o,k)=>o[k]||(o[k]=node())});
 Object.defineProperty(nodes.foodSelect,'options',{get:()=>nodes.foodSelect.children});
 nodes.mealType.value='lunch';nodes.foodGrams.value='100';
 let resolveFetch;const waiting=new Promise(resolve=>resolveFetch=resolve);
 const ctx=vm.createContext({document:{getElementById:k=>nodes[k],createElement:()=>node(),createTextNode:v=>({textContent:String(v)})},window:{confirm:()=>true},
  WellBodyStorage:{KEYS:storage.KEYS,create:()=>storage.create(backend)},WellBodyModels:models,WellBodyCalculations:calc,
  fetch:()=>waiting,console,crypto:{randomUUID:()=> 'synthetic-meal'}});
 vm.runInContext(index.slice(start,end),ctx);vm.runInContext('dateKey=()=>"2020-01-02"',ctx);
 return {ctx,nodes,data,calls,backend,failReads,failWrites,failRemoves,
 run:code=>vm.runInContext(code,ctx),json:code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx)),
 async ready(){resolveFetch({ok:true,json:async()=>({foods:[]})});await new Promise(resolve=>setImmediate(resolve));}};
}
module.exports={app,storage,node};
