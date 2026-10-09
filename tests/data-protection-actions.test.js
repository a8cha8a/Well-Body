const test=require('node:test'),assert=require('node:assert/strict');
const {app,storage}=require('./helpers/app.js');
const keys=storage.KEYS;
const plan={sex:'male',age:40,height:175,startWeight:80,goalWeight:72,activity:1.2,startDate:'2020-01-01',goalDate:'2020-12-31',extension:{keep:true}};
const weights=[{date:'2020-01-01',weight:80,extension:'keep'}];
const meals=[{date:'2020-01-01',type:'lunch',foodId:'unknown',grams:100,extension:'keep'}, {mealId:'saved',date:'2020-01-02',type:'dinner',items:[{foodId:'unknown',grams:100,kcal:null,protein:null,fat:null,carbs:null,foodDataVersion:'old',extension:'keep'}],extension:'keep'}];
const dishes=[{dishId:'saved',name:'架空料理',referenceWeight:100,kcal:100,protein:10,fat:2,carbs:10,extension:{keep:true}}];
const initial=()=>({[keys.plan]:JSON.stringify(plan),[keys.weightRecords]:JSON.stringify(weights),[keys.meals]:JSON.stringify(meals),[keys.customDishes]:JSON.stringify(dishes)});
test('incomplete meal normalization fails closed in handlers and storage API',async()=>{
 const a=app(initial());
 a.ctx.WellBodyModels={...a.ctx.WellBodyModels,normalizeMeals:()=>[]};
 await a.ready();
 a.run('addMeal();deleteMealById("saved")');
 assert.equal(storage.create(a.backend).saveMeals([]),false);
 assert.equal(storage.create(a.backend).clearMeals(),false);
 assert.equal(a.data.get(keys.meals),initial()[keys.meals]);
 assert.equal(a.calls.write.length,0);assert.equal(a.calls.remove.length,0);
 assert.match(a.nodes.storageMessage.textContent,/形式を確認できません/);
});
function input(a){a.nodes.recordDate.value='2020-01-02';a.nodes.recordWeight.value='79';a.nodes.foodSelect.value='rice';a.nodes.foodGrams.value='120';a.nodes.customDishName.value='架空追加料理';for(const id of ['customDishWeight','customDishKcal','customDishProtein','customDishFat','customDishCarbs'])a.nodes[id].value='100';}
test('startup/recalculation never save plan; food master pending blocks actual meal add/delete',async()=>{
 const a=app(initial());input(a);a.run('addMeal();deleteMealById("saved");calculate()');
 assert.equal(a.calls.write.length,0);assert.equal(a.calls.remove.length,0);assert.match(a.nodes.mealInputMessage.textContent,/読み込みが完了/);
 await a.ready();assert.equal(a.calls.write.length,0);assert.equal(a.json('meals').length,2);
 a.run('addMeal()');assert.equal(JSON.parse(a.data.get(keys.meals)).length,3);
 assert.deepEqual(JSON.parse(a.data.get(keys.meals)).slice(0,2),meals);
 assert.match(a.nodes.mealInputMessage.textContent,/追加しました/);
});
for(const kind of Object.keys(keys)){
 for(const mode of ['read-error','invalid']){
  test(`${kind}: actual handlers block ${mode}, preserve raw data and input`,async()=>{
   const values=initial();if(mode==='invalid')values[keys[kind]]=kind==='plan'?'null':JSON.stringify([...(JSON.parse(values[keys[kind]])),{broken:true}]);
   const raw=values[keys[kind]],a=app(values,{failReads:mode==='read-error'?[keys[kind]]:[]});await a.ready();input(a);
   a.failReads.clear(); // write access has recovered, but no successful reread yet.
   if(kind==='plan')a.run('savePlanAndCalculate();calculate()');
   if(kind==='weightRecords')a.run('recordWeight()');
   if(kind==='meals')a.run('addMeal();deleteMealById("saved")');
   if(kind==='customDishes')a.run('registerCustomDish()');
   assert.equal(a.calls.write.includes(keys[kind]),false);assert.equal(a.calls.remove.includes(keys[kind]),false);assert.equal(a.data.get(keys[kind]),raw);
   assert.equal(a.nodes.recordWeight.value,'79');assert.equal(a.nodes.foodGrams.value,'120');assert.equal(a.nodes.customDishName.value,'架空追加料理');
   assert.match(a.nodes.storageMessage.textContent,/元のデータを守る/);
  });
 }
}
test('normal first use and empty datasets save without automatic writes',async()=>{
 const a=app({[keys.weightRecords]:'[]',[keys.meals]:'[]',[keys.customDishes]:'[]'});await a.ready();input(a);
 assert.equal(a.calls.write.length,0);a.run('recordWeight();addMeal();registerCustomDish();savePlanAndCalculate()');
 for(const key of Object.values(keys))assert.ok(a.data.has(key));
 assert.equal(a.json('records').length,1);assert.equal(a.json('meals').length,1);assert.equal(a.json('customDishes').length,1);
});
test('actual save failures preserve committed state, queues and user inputs',async()=>{
 const a=app(initial());await a.ready();input(a);const before={plan:a.json('plan'),records:a.json('records'),meals:a.json('meals'),customDishes:a.json('customDishes')};
 for(const key of Object.values(keys))a.failWrites.add(key);
 a.run('voiceItems=[{foodId:"rice",grams:120}];recordWeight();addMeal();registerCustomDish();savePlanAndCalculate()');
 for(const [name,value]of Object.entries(before))assert.deepEqual(a.json(name),value);
 assert.deepEqual(Object.fromEntries(a.data),initial());assert.equal(a.json('voiceItems').length,1);
 assert.equal(a.nodes.foodGrams.value,'120');assert.equal(a.nodes.customDishName.value,'架空追加料理');assert.equal(a.nodes.recordWeight.value,'79');
 for(const id of ['recordMessage','mealInputMessage','customDishMessage','message'])assert.match(a.nodes[id].textContent,/保存できません/);
 a.failWrites.clear();a.run('recordWeight();addMeal();registerCustomDish();savePlanAndCalculate()');
 assert.equal(a.json('records').length,2);assert.equal(a.json('meals').length,3);assert.equal(a.json('customDishes').length,2);
 assert.deepEqual(JSON.parse(a.data.get(keys.meals)).slice(0,2),meals);assert.deepEqual(JSON.parse(a.data.get(keys.customDishes))[0],dishes[0]);
 assert.deepEqual(JSON.parse(a.data.get(keys.plan)).extension,plan.extension);
});
test('same-date weight update preserves optional fields and does not save plan',async()=>{
 const a=app(initial());await a.ready();input(a);a.nodes.recordDate.value='2020-01-01';a.run('recordWeight()');
 assert.deepEqual(JSON.parse(a.data.get(keys.weightRecords)),[{...weights[0],weight:79}]);assert.deepEqual(a.calls.write,[keys.weightRecords]);
});
test('meal deletion succeeds only after persistence, and retains legacy raw records',async()=>{
 const a=app(initial());await a.ready();a.failWrites.add(keys.meals);a.run('deleteMealById("saved")');assert.equal(a.json('meals').length,2);assert.equal(a.data.get(keys.meals),initial()[keys.meals]);
 a.failWrites.clear();a.run('deleteMealById("saved")');assert.deepEqual(JSON.parse(a.data.get(keys.meals)),[meals[0]]);assert.equal(a.json('meals').length,1);
});
test('reset preflight prevents every deletion on unread/invalid targets',async()=>{
 const pending=app(initial());pending.run('resetDemo()');assert.equal(pending.calls.remove.length,0);
 for(const kind of ['plan','weightRecords','meals']){const values=initial();values[keys[kind]]='{broken';const a=app(values);await a.ready();a.run('resetDemo()');assert.equal(a.calls.remove.length,0);assert.deepEqual(Object.fromEntries(a.data),values);}
});
test('partial reset failure is honest, stops further deletion and preserves in-memory data',async()=>{
 const a=app(initial());await a.ready();a.failRemoves.add(keys.weightRecords);a.run('resetDemo()');
 assert.deepEqual(a.calls.remove,[keys.plan,keys.weightRecords]);assert.equal(a.data.has(keys.plan),false);assert.equal(a.data.get(keys.meals),initial()[keys.meals]);assert.equal(a.data.get(keys.customDishes),initial()[keys.customDishes]);assert.deepEqual(a.json('records'),weights);
 assert.match(a.nodes.message.textContent,/一部だけ削除/);assert.doesNotMatch(a.nodes.message.textContent,/戻しました/);
});
test('successful reset does not add custom dishes to deletion targets or save defaults',async()=>{
 const a=app(initial());await a.ready();a.run('resetDemo()');assert.deepEqual(a.calls.remove,[keys.plan,keys.weightRecords,keys.meals]);assert.equal(a.calls.write.length,0);assert.equal(a.data.get(keys.customDishes),initial()[keys.customDishes]);assert.deepEqual(a.json('records'),[]);
});
test('new app session recovers existing records only after normal reread',async()=>{
 const values=initial(),a=app(values,{failReads:Object.values(keys)});await a.ready();input(a);a.failReads.clear();a.run('recordWeight();addMeal();registerCustomDish();savePlanAndCalculate()');assert.equal(a.calls.write.length,0);
 const reload=app(Object.fromEntries(a.data));await reload.ready();assert.deepEqual(reload.json('records'),weights);assert.deepEqual(reload.json('storedMeals'),meals);assert.deepEqual(reload.json('storedCustomDishes'),dishes);input(reload);reload.run('recordWeight()');assert.equal(reload.json('records').length,2);
});
