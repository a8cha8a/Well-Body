const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const index=fs.readFileSync(require.resolve("../index.html"),"utf8");
const models=require("../models.js");

test("MEXT runtime wiring exists",()=>{
 assert.ok(index.includes('fetch("./data/mext/food-master.json"'));
 assert.ok(index.includes("MEXT食品マスター"));
 assert.ok(index.includes('id="foodSearch"'));
});

test("incomplete nutrient data cannot become an official meal snapshot",()=>{
 const food=models.createFood({
  foodId:"mext-test",
  name:"test",
  category:"01",
  state:"as_listed",
  referenceWeight:100,
  kcal:100,
  protein:null,
  fat:1,
  carbs:2,
  nutritionStatus:"partial",
  source:"MEXT",
  dataVersion:"2026-03-27"
 });
 assert.equal(models.createMealItem(food,100),null);
});

test("complete food data still creates a meal snapshot",()=>{
 const food=models.createFood({
  foodId:"demo-test",
  name:"test",
  category:"demo",
  state:"as_listed",
  referenceWeight:100,
  kcal:100,
  protein:10,
  fat:5,
  carbs:20,
  source:"test",
  dataVersion:"test-1"
 });
 const item=models.createMealItem(food,150);
 assert.equal(item.kcal,150);
 assert.equal(item.protein,15);
 assert.equal(item.fat,7.5);
 assert.equal(item.carbs,30);
});


test("daily meal totals aggregate fat into the displayed f total",()=>{
 assert.ok(index.includes("const totals={kcal:0,p:0,f:0,c:0}"));
 assert.ok(index.includes("totals.kcal+=item.kcal;"));
 assert.ok(index.includes("totals.p+=item.protein;"));
 assert.ok(index.includes("totals.f+=item.fat;"));
 assert.ok(index.includes("totals.c+=item.carbs;"));
 assert.equal(index.includes("totals.fat+=item.fat;"),false);
});


test("meal selection UX keeps MEXT source-of-truth visible",()=>{
 assert.ok(index.includes('id="selectedFoodMessage"'));
 assert.ok(index.includes('"選択中："+food.name+" ／ "+food.referenceWeight+"g基準"'));
 assert.ok(index.includes("食品・栄養値はMEXT食品マスターを基準にしています。"));
 assert.equal(index.includes("※現在は動作確認用の食品データです。後の工程で食品データを拡張します。"),false);
});


test("meal input gives clear validation and success feedback",()=>{
 assert.ok(index.includes('id="mealInputMessage"'));
 assert.ok(index.includes("量は1g以上で入力してください。"));
 assert.ok(index.includes("食品を選択してください。"));
 assert.ok(index.includes("食事を追加しました。今日の食事・PFCに反映されています。"));
 assert.ok(index.includes("保存できませんでした。端末の保存設定を確認して、もう一度お試しください。"));
});

test("natural text selection refreshes selected food confirmation",()=>{
 assert.ok(index.includes('document.getElementById("foodSelect").value=hit.foodId;'));
 assert.ok(index.includes("updateSelectedFoodMessage();"));
 assert.ok(index.includes('document.getElementById("foodSelect").value=food.foodId;\n updateSelectedFoodMessage();'));
});


test("meal input feedback distinguishes errors and success visually",()=>{
 assert.ok(index.includes('class="feedback" role="status" aria-live="polite"'));
 assert.ok(index.includes('.feedback.error{display:block'));
 assert.ok(index.includes('.feedback.success{display:block'));
 assert.ok(index.includes('input.input-error'));
 assert.ok(index.includes('setMealInputFeedback("量は1g以上で入力してください。","error")'));
 assert.ok(index.includes('setMealInputFeedback("食事を追加しました。今日の食事・PFCに反映されています。","success")'));
});


test("natural meal input uses iPhone dictation without browser speech recognition",()=>{
 assert.ok(index.includes('placeholder="例：昼食は親子丼とサラダだった"'));
 assert.ok(index.includes("iPhoneではキーボードのマイクから話して入力できます。Well-Bodyは文字になった内容だけを解析します。"));
 assert.ok(index.includes("function analyzeNaturalMealText()"));
 assert.ok(index.includes("function detectMealTypeFromText(text)"));
 assert.ok(index.includes("未登録料理として扱う候補です。勝手には記録しません。"));
 assert.equal(index.includes("new SpeechRecognition()"),false);
 assert.equal(index.includes("rec.start()"),false);
});



test("natural meal input checks custom dishes and never invents 100g when amount is missing",()=>{
 assert.ok(index.includes("function loadCustomDishes()"));
 assert.ok(index.includes("function findCustomDishMatches(text)"));
 assert.ok(index.includes("WellBodyModels.customDishToFood(dish)"));
 assert.ok(index.includes('document.getElementById("foodGrams").value=grams||"";'));
 assert.ok(index.includes("量が分からないため、量を入力してから記録してください。"));
});


test("natural parser preserves known foods even when quantity is unknown",()=>{
 assert.ok(index.includes('return {food:current.food,grams:quantity.kind==="grams"&&quantity.grams>0?quantity.grams:null,quantity};'));
 assert.ok(index.includes("const completeItems=items.filter(item=>item.grams);"));
 assert.ok(index.includes("const incompleteItems=items.filter(item=>!item.grams);"));
 assert.ok(index.includes("食品は見つかりましたが、量が分からないものがあります。量を入力してから記録してください。"));
 assert.ok(index.includes('document.getElementById("foodGrams").value="";'));
});


test("natural quantities classify servings without unsafe gram conversion",()=>{
 assert.ok(index.includes("function parseNaturalQuantity(text)"));
 assert.ok(index.includes('(個|杯|枚|本|パック|袋|皿|人前)'));
 assert.ok(index.includes('kind:"serving"'));
 assert.ok(index.includes('grams:null'));
 assert.ok(index.includes("g換算できる基準がありません。量を確認してください。"));
 assert.ok(index.includes('/半分|半量/'));
 assert.ok(index.includes('/大盛り|少なめ|多め/'));
});


test("meal queue survives failed saves and unknown-quantity parsing cannot submit partial queue",()=>{
 assert.ok(index.includes('if(incompleteItems.length){\n   voiceAnalysisBlocked=true;\n   voiceItems=[];\n   renderVoiceItems();'));
 assert.equal(index.includes('  voiceItems=[];\n }else{\n  const foodId='),false);
 assert.ok(index.includes(' voiceItems=[];\n renderMeals();\n renderVoiceItems();'));
});

const vm=require("node:vm");
function parserContext(){
 const html=fs.readFileSync(require.resolve("../index.html"),"utf8");
 const start=html.indexOf("function normalizeVoiceText(text){");
 const end=html.indexOf("function findFoodFromVoice(text){",start);
 assert.ok(start>=0&&end>start);
 const context=vm.createContext({
  foodData:[
   {foodId:"rice",name:"ご飯"},
   {foodId:"natto",name:"納豆"},
   {foodId:"egg",name:"卵"}
  ],
  customDishes:[]
 });
 vm.runInContext(html.slice(start,end).replace("function hasUnrecognizedFood(text){","function findCustomDishMatches(text){return []; }\nfunction hasUnrecognizedFood(text){"),context);
 return context;
}
test("natural parser does not attach salad grams to rice",()=>{
 const ctx=parserContext();
 const result=vm.runInContext('parseVoiceItems("ご飯とサラダ100g")',ctx);
 assert.equal(result.length,1);
 assert.equal(result[0].grams,null);
 assert.equal(vm.runInContext('hasUnrecognizedFood("ご飯とサラダ100g")',ctx),true);
});
test("natural parser flags unknown foods in mixed inputs",()=>{
 const ctx=parserContext();
 assert.equal(vm.runInContext('hasUnrecognizedFood("ご飯200gとサラダ100g")',ctx),true);
 assert.equal(vm.runInContext('hasUnrecognizedFood("納豆100gとご飯150g")',ctx),false);
});
test("natural parser handles full-width decimals and rejects negative quantities",()=>{
 const ctx=parserContext();
 assert.equal(vm.runInContext('parseVoiceAmount("１．５kg")',ctx),1500);
 assert.equal(vm.runInContext('parseVoiceAmount("二百グラム")',ctx),200);
 assert.equal(vm.runInContext('parseVoiceAmount("-100g")',ctx),null);
});
test("meal saving rejects partial queue and blocked analyses",()=>{
 assert.ok(index.includes('if(items.length!==rawItems.length)return;'));
 assert.ok(index.includes('if(voiceAnalysisBlocked){setMealInputFeedback('));
 assert.ok(index.includes('if(saveResult!==true){'));
});

test("custom dish registration is offline, validates inputs and preserves data on write failure",()=>{
 assert.ok(index.includes('function registerCustomDish(){'));
 assert.ok(index.includes('WellBodyModels.createCustomDish({'));
 assert.ok(index.includes('saveCustomDishes(next)!==true'));
 assert.ok(index.includes('入力内容は残っています。'));
 assert.ok(index.includes('customDishes=next;'));
 assert.ok(index.includes('customDishes.forEach(dish=>{'));
 assert.ok(index.includes('WellBodyModels.customDishToFood(dish)'));
});
test("meal history does not interpolate user-provided food names as HTML",()=>{
 assert.ok(index.includes('li.appendChild(document.createTextNode(" "+foodName+" "+item.grams+"g"));'));
 assert.equal(index.includes('li.innerHTML="<strong>"+typeName+"</strong> "+foodName'),false);
});

test("meal phrases are not silently logged as rice",()=>{
 const ctx=parserContext();
 assert.equal(vm.runInContext('findFoodMatches("朝ごはん")',ctx).length,0);
 assert.equal(vm.runInContext('findFoodMatches("昼ごはん")',ctx).length,0);
 assert.equal(vm.runInContext('findFoodMatches("ご飯200g")',ctx).length,1);
});
test("editing text invalidates candidates until reanalysis",()=>{
 assert.ok(index.includes('document.getElementById("voiceText").addEventListener("input",()=>{'));
 assert.ok(index.includes('voiceAnalysisBlocked=true;'));
 assert.ok(index.includes('入力が変更されました。もう一度解析してください。'));
});

test("natural parser does not silently merge repeated food mentions",()=>{
 const ctx=parserContext();
 const result=vm.runInContext('parseVoiceItems("納豆100gと納豆50g")',ctx);
 assert.equal(result.length,2);
 assert.equal(result[0].grams,100);
 assert.equal(result[1].grams,50);
 assert.ok(index.includes('new Set(items.map(item=>item.food.foodId)).size!==items.length'));
 assert.ok(index.includes('同じ食品が複数回あります。数量をまとめて入力するか、別々に記録してください。'));
});

test("ambiguous mixed food quantities remain unrecorded",()=>{
 const ctx=parserContext();
 const result=vm.runInContext('parseVoiceItems("ご飯とサラダ100g")',ctx);
 assert.equal(result[0].grams,null);
 assert.equal(vm.runInContext('hasUnrecognizedFood("ご飯とサラダ100g")',ctx),true);
});

test("editing analyzed text keeps a visible reanalysis warning",()=>{
 assert.ok(index.includes('setVoiceAnalysisFeedback("入力が変更されました。もう一度解析してください。","warning");'));
 assert.ok(index.includes('.analysis-feedback.warning{'));
 assert.ok(index.includes('role="status" aria-live="polite"'));
});

test("multiple custom dish matches are blocked rather than selecting the first",()=>{
 assert.ok(index.includes("if(customHits.length>1){"));
 assert.ok(index.includes("複数のマイ料理が見つかりました。誤記録防止のため1品ずつ入力してください。"));
 assert.ok(index.includes('voiceAnalysisBlocked=true;\n   document.getElementById("foodSelect").value="";'));
});

test("multiple custom dishes are rejected in executable analysis flow without writing storage",()=>{
 const html=fs.readFileSync(require.resolve("../index.html"),"utf8");
 const start=html.indexOf("function analyzeNaturalMealText(){");
 const end=html.indexOf("\nlet voiceItems=[];",start);
 assert.ok(start>=0&&end>start);
 const nodes={
  voiceText:{value:"テスト料理A100gとテスト料理B100g"},
  foodSelect:{value:"old"},
  foodGrams:{value:"100"},
  mealType:{value:"lunch"},
  voiceMessage:{textContent:"",className:""}
 };
 const ctx=vm.createContext({
  document:{getElementById:id=>nodes[id]||{value:""}},
  normalizeVoiceText:s=>s,voiceItems:[],voiceAnalysisBlocked:false,
  renderVoiceItems:()=>{},detectMealTypeFromText:()=>null,
  setVoiceAnalysisFeedback:(message,type)=>{nodes.voiceMessage.textContent=({error:"⚠ 要修正：",warning:"ⓘ 要確認：",success:"✓ 解析成功："}[type]||"")+message;nodes.voiceMessage.className="analysis-feedback "+type;},
  hasUnrecognizedFood:()=>false,parseVoiceItems:()=>[],
  findCustomDishMatches:()=>[{name:"テスト料理A"},{name:"テスト料理B"}],
  parseVoiceAmount:()=>100,
  foodMap:new Map(),foodData:[],renderFoodOptions:()=>{},
  updateSelectedFoodMessage:()=>{},WellBodyModels:{customDishToFood:()=>{throw Error("should not convert");}}
 });
 vm.runInContext(html.slice(start,end),ctx);
 vm.runInContext("analyzeNaturalMealText()",ctx);
 assert.equal(ctx.voiceAnalysisBlocked,true);
 assert.equal(nodes.foodSelect.value,"");
 assert.equal(nodes.foodGrams.value,"");
 assert.match(nodes.voiceMessage.textContent,/複数のマイ料理が見つかりました/);
 assert.match(nodes.voiceMessage.className,/error/);
});
