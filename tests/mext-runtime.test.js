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

test("voice selection refreshes selected food confirmation",()=>{
 assert.ok(index.includes("if(hit){document.getElementById(\"foodSelect\").value=hit.foodId;updateSelectedFoodMessage();}"));
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


test("voice recognition does not auto-restart on iPhone",()=>{
 assert.ok(index.includes("if(!voiceListening||activeRecognition)return;"));
 assert.ok(index.includes('voiceListening=false;\n  setVoiceUI(false,"音声入力を終了しました。続けて入力する場合は、もう一度「音声入力」をタップしてください。");'));
 assert.equal(index.includes("setTimeout(()=>startVoiceRecognition(),150)"),false);
 assert.equal(index.includes("setTimeout(()=>startVoiceRecognition(),250)"),false);
 assert.ok(index.includes("マイクを起動しています… 起動するまで話さずにお待ちください。"));
});
