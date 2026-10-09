const test=require('node:test');
const assert=require('node:assert/strict');
const storage=require('../storage.js');
const fixtures={
 plan:{sex:'male',age:40,height:175,startWeight:80,goalWeight:72,activity:1.2,startDate:'2020-01-01',goalDate:'2020-12-31',extra:{keep:true}},
 weightRecords:[{date:'2020-01-01',weight:80,extra:'keep'}],
 meals:[{date:'2020-01-01',type:'lunch',foodId:'unknown',grams:100,extra:'keep'},{mealId:'m1',date:'2020-01-01',type:'dinner',extra:'keep',items:[{foodId:'unknown',grams:100,kcal:null,protein:null,fat:null,carbs:null,foodDataVersion:null,nutritionStatus:'unknown',extra:'keep'}]}],
 customDishes:[{dishId:'synthetic',name:'架空料理',referenceWeight:100,kcal:100,protein:10,fat:2,carbs:10,extra:{keep:true}}]
};
const methods={plan:['getPlan','savePlan','clearPlan'],weightRecords:['getWeightRecords','saveWeightRecords','clearWeightRecords'],meals:['getMeals','saveMeals','clearMeals'],customDishes:['getCustomDishes','saveCustomDishes','clearCustomDishes']};
function backend(raw,key){
 const data=new Map(raw===undefined?[]:[[key,raw]]);let readsFail=false,writesFail=false,removesFail=false;
 const calls={write:0,remove:0};
 return {data,calls,setReadFailure:v=>readsFail=v,setWriteFailure:v=>writesFail=v,setRemoveFailure:v=>removesFail=v,
 getItem:k=>{if(readsFail)throw Error('synthetic read failure');return data.get(k)??null;},
 setItem(k,v){calls.write++;if(writesFail)throw Error('synthetic write failure');data.set(k,v);},
 removeItem(k){calls.remove++;if(removesFail)throw Error('synthetic remove failure');data.delete(k);}};
}
for(const [kind,[get,save,clear]] of Object.entries(methods)){
 const key=storage.KEYS[kind],value=fixtures[kind];
 test(`${kind}: T01/T02/T03/T12 readiness, missing/empty, shared create and raw compatibility`,()=>{
  const b=backend(undefined,key),api=storage.create(b);
  assert.equal(api.getState(key),'unchecked');assert.equal(api[save](value),false);assert.equal(api[clear](),false);
  assert.deepEqual(b.calls,{write:0,remove:0});
  assert.equal(api[get]().ok,true);assert.equal(api.getState(key),'missing');
  assert.equal(storage.create(b)[save](value),true);
  assert.deepEqual(api[get]().value,value);
  const raw=b.data.get(key);assert.equal(api[get]().ok,true);assert.equal(b.data.get(key),raw);
  assert.equal(api[save](value),true);assert.equal(api[clear](),true);
  if(kind!=='plan'){assert.equal(api[save]([]),true);assert.deepEqual(api[get]().value,[]);}
 });
 test(`${kind}: T04/T07/T09 read failure blocks writes/removes until successful reread`,()=>{
  const raw=JSON.stringify(value),b=backend(raw,key);b.setReadFailure(true);
  const api=storage.create(b);assert.equal(api[get]().ok,false);assert.equal(api.getState(key),'read-error');
  b.setReadFailure(false);
  assert.equal(storage.create(b)[save](value),false);assert.equal(api[clear](),false);
  assert.deepEqual(b.calls,{write:0,remove:0});assert.equal(b.data.get(key),raw);
  const reload=storage.create(b);assert.deepEqual(reload[get]().value,value);assert.equal(reload[save](value),true);
 });
 test(`${kind}: T05/T06/T10 malformed data remains untouched after reload`,()=>{
  const invalids=['{broken','null','"text"',kind==='plan'?'[]':'{}'];
  if(kind!=='plan')invalids.push(JSON.stringify([...value,{broken:true}]));
  for(const raw of invalids){const b=backend(raw,key),api=storage.create(b);
   assert.equal(api[get]().ok,false);assert.equal(api.getState(key),'invalid');
   assert.equal(api[save](value),false);assert.equal(api[clear](),false);
   assert.equal(storage.create(b)[get]().ok,false);assert.equal(api[save](value),false);
   assert.equal(b.data.get(key),raw);assert.deepEqual(b.calls,{write:0,remove:0});
  }
 });
 test(`${kind}: T08 write/remove failure retains exact raw data`,()=>{
  const raw=JSON.stringify(value),b=backend(raw,key),api=storage.create(b);api[get]();
  b.setWriteFailure(true);b.setRemoveFailure(true);
  assert.equal(api[save](value),false);assert.equal(api[clear](),false);assert.equal(b.data.get(key),raw);
  b.setWriteFailure(false);assert.equal(api[save](value),true);
 });
}
test('T11 independent keys, and inability to obtain localStorage is a read error',()=>{
 const b=backend('{broken',storage.KEYS.plan),api=storage.create(b);
 api.getPlan();api.getWeightRecords();assert.equal(api.savePlan(fixtures.plan),false);assert.equal(api.saveWeightRecords([]),true);
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('synthetic denied access');}});
  const denied=storage.create();assert.equal(denied.getPlan().ok,false);assert.equal(denied.savePlan(fixtures.plan),false);
 }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});
module.exports={fixtures,backend};
