const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./helpers/app.js');
function input(a,text){a.nodes.voiceText.value=text;a.nodes.voiceText.listeners.input();}
function select(a,id='rice'){a.nodes.foodSelect.value=id;a.nodes.foodSelect.listeners.change();a.nodes.foodGrams.value='100';}
test('empty natural input restores manual save and synchronizes selection/warnings',async()=>{
 const a=app();await a.ready();
 input(a,'白米');a.run('analyzeNaturalMealText();addMeal()');
 assert.equal(a.run('voiceAnalysisBlocked'),true);assert.equal(a.calls.write.length,0);
 assert.match(a.nodes.voiceMessage.textContent,/自然文にg数/);assert.match(a.nodes.mealInputMessage.textContent,/未解決/);
 input(a,'');assert.equal(a.run('voiceAnalysisBlocked'),false);
 assert.equal(a.nodes.mealInputMessage.textContent,'');assert.equal(a.nodes.selectedFoodMessage.textContent,'食品を選択してください。');
 a.run('analyzeNaturalMealText()');assert.equal(a.run('voiceAnalysisBlocked'),false);
 select(a);assert.match(a.nodes.selectedFoodMessage.textContent,/ご飯（白米）/);
 a.run('addMeal()');assert.equal(a.json('meals').length,1);assert.deepEqual(a.calls.write,['wellBodyMeals']);
 assert.match(a.nodes.mealInputMessage.textContent,/追加しました/);
 select(a,'');assert.equal(a.nodes.selectedFoodMessage.textContent,'食品を選択してください。');
});
for(const text of ['白米','白米100gと未知料理100g','白米100gと納豆']){
 test(`manual selection cannot bypass unresolved natural input: ${text}`,async()=>{
  const a=app();await a.ready();input(a,text);a.run('analyzeNaturalMealText()');select(a);a.run('addMeal()');
  assert.equal(a.run('voiceAnalysisBlocked'),true);assert.equal(a.calls.write.length,0);assert.equal(a.json('meals').length,0);
  assert.match(a.nodes.mealInputMessage.textContent,/未解決/);
 });
}
test('successful reanalysis clears old warning without saving automatically',async()=>{
 const a=app();await a.ready();input(a,'白米');a.run('analyzeNaturalMealText();addMeal()');
 input(a,'白米100g');a.run('analyzeNaturalMealText()');
 assert.equal(a.run('voiceAnalysisBlocked'),false);assert.equal(a.nodes.mealInputMessage.textContent,'');assert.equal(a.calls.write.length,0);
 a.run('addMeal()');assert.equal(a.json('meals').length,1);
});
test('manual recovery never bypasses food-master pending or stored-data protection',async()=>{
 const a=app();input(a,'白米');a.run('analyzeNaturalMealText()');input(a,'');select(a);a.run('addMeal()');
 assert.equal(a.calls.write.length,0);assert.match(a.nodes.mealInputMessage.textContent,/読み込みが完了/);
 const b=app({wellBodyMeals:'{broken'});await b.ready();input(b,'白米');b.run('analyzeNaturalMealText()');input(b,'');select(b);b.run('addMeal()');
 assert.equal(b.calls.write.length,0);assert.equal(b.data.get('wellBodyMeals'),'{broken');
});
