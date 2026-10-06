const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const index=fs.readFileSync(require.resolve("../index.html"),"utf8");
const models=require("../models.js");

test("MEXT runtime wiring exists",()=>{
 assert.ok(index.includes('fetch("./data/mext/food-master.json"'));
 assert.ok(index.includes("MEXT食品マスター"));
 assert.ok(index.includes("id="foodSearch""));
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
