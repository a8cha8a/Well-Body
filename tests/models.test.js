const assert = require("node:assert/strict");
const WellBodyModels = require("../models.js");

const foods = [
  WellBodyModels.createFood({
    foodId: "egg",
    name: "鶏卵",
    category: "egg",
    state: "raw",
    referenceWeight: 100,
    kcal: 142,
    protein: 12,
    fat: 10,
    carbs: 0.4,
    source: "current-demo",
    dataVersion: "demo-1"
  }),
  WellBodyModels.createFood({
    foodId: "rice",
    name: "ご飯（白米）",
    category: "grain",
    state: "cooked",
    referenceWeight: 100,
    kcal: 156,
    protein: 2.5,
    fat: 0.3,
    carbs: 35.6,
    source: "current-demo",
    dataVersion: "demo-1"
  })
];

assert.deepEqual(foods[0], {
  foodId: "egg", name: "鶏卵", category: "egg", state: "raw",
  referenceWeight: 100, kcal: 142, protein: 12, fat: 10, carbs: 0.4,
  source: "current-demo", dataVersion: "demo-1"
});

const item = WellBodyModels.createMealItem(foods[0], 50);
assert.deepEqual(item, {
  foodId: "egg", grams: 50, kcal: 71, protein: 6, fat: 5, carbs: 0.2,
  foodDataVersion: "demo-1"
});

const meal = WellBodyModels.createMeal({
  mealId: "meal-1",
  date: "2026-10-06",
  type: "breakfast",
  items: [item]
});
assert.equal(meal.mealId, "meal-1");
assert.equal(meal.type, "breakfast");
assert.equal(meal.items.length, 1);

const legacy = [
  {date:"2026-10-06",type:"breakfast",foodId:"egg",grams:50},
  {date:"2026-10-06",type:"lunch",foodId:"rice",grams:180},
  {date:"2026-10-06",type:"snack",foodId:"egg",grams:25},
  {date:"2026-10-06",type:"dinner",foodId:"rice",grams:200}
];
const foodMap = new Map(foods.map(food => [food.foodId, food]));
const migrated = WellBodyModels.normalizeMeals(legacy, foodMap);

assert.equal(migrated.length, 4);
assert.deepEqual(migrated.map(m => m.type), ["breakfast","lunch","snack","dinner"]);
assert.equal(migrated[0].items[0].kcal, 71);
assert.equal(migrated[1].items[0].carbs, 35.6 * 1.8);
assert.equal(migrated[0].items[0].grams, 50);
assert.equal(migrated[0].date, "2026-10-06");

// Snapshot is independent from later Food changes.
const before = migrated[0].items[0].kcal;
foods[0].kcal = 999;
assert.equal(migrated[0].items[0].kcal, before);

// New snapshot uses the Food value at creation time.
const changed = WellBodyModels.createMealItem(foods[0], 50);
assert.equal(changed.kcal, 999 * 0.5);
assert.equal(migrated[0].items[0].kcal, 71);

// Invalid weights never create a numeric meal item.
assert.equal(WellBodyModels.createMealItem(foods[0], 0), null);
assert.equal(WellBodyModels.createMealItem(foods[0], -1), null);
assert.equal(WellBodyModels.createMealItem(foods[0], "abc"), null);
assert.equal(WellBodyModels.createMealItem(foods[0], 0.5).grams, 0.5);

// Invalid meal dates/types are rejected.
assert.equal(WellBodyModels.createMeal({mealId:"x",date:"2026/10/06",type:"breakfast",items:[]}), null);
assert.equal(WellBodyModels.createMeal({mealId:"x",date:"2026-10-06",type:"midnight",items:[]}), null);

// Unknown legacy food is retained without guessed nutrition.
const unknown = WellBodyModels.normalizeMeals(
  [{date:"2026-10-06",type:"dinner",foodId:"unknown-food",grams:100}],
  foodMap
)[0];
assert.equal(unknown.items[0].nutritionStatus, "unknown");
assert.equal(unknown.items[0].kcal, null);
assert.equal(unknown.items[0].protein, null);

// Multiple foods / meals can be represented and derived into DailyNutrition.
const multi = WellBodyModels.createMeal({
  mealId:"meal-2", date:"2026-10-06", type:"dinner",
  items:[
    WellBodyModels.createMealItem(foods[1],100),
    WellBodyModels.createMealItem(foods[1],50)
  ]
});
const daily = WellBodyModels.toDailyNutrition([migrated[0], multi, unknown]);
assert.equal(daily.length, 1);
assert.equal(daily[0].date, "2026-10-06");
assert.equal(daily[0].mealCount, 3);
assert.equal(daily[0].kcal, 71 + 156 + 78);


const unknownMeal = WellBodyModels.normalizeMeals(
  [{date:"2026-10-06",type:"dinner",foodId:"missing-food",grams:100}],
  foodMap
)[0];
assert.equal(unknownMeal.items[0].nutritionStatus, "unknown");
assert.equal(unknownMeal.items[0].kcal, null);
assert.equal(unknownMeal.items[0].foodId, "missing-food");

const foodIds = foods.map(food => food.foodId);
assert.deepEqual(foodIds, ["egg", "rice"]);
assert.equal(foods.some(food => food.id), false);


// Custom dishes are validated separately, then adapted to the existing food snapshot path.
const customDish = WellBodyModels.createCustomDish({
  dishId:"oyakodon", name:" 親子丼 ", aliases:["親子どん"],
  referenceWeight:300, kcal:520, protein:24, fat:14, carbs:72,
  source:"user", confidence:"confirmed"
});
assert.equal(customDish.name, "親子丼");
assert.equal(customDish.referenceWeight, 300);
const customFood = WellBodyModels.customDishToFood(customDish);
assert.equal(customFood.foodId, "custom:oyakodon");
assert.equal(customFood.source, "custom-dish:user");
const customItem = WellBodyModels.createMealItem(customFood, 150);
assert.equal(customItem.kcal, 260);
assert.equal(customItem.protein, 12);

// Invalid or incomplete nutrition is never silently accepted.
assert.equal(WellBodyModels.createCustomDish({name:"不明料理",referenceWeight:100,kcal:null,protein:10,fat:5,carbs:20}), null);
assert.equal(WellBodyModels.createCustomDish({name:"不明料理",referenceWeight:0,kcal:100,protein:10,fat:5,carbs:20}), null);
assert.equal(WellBodyModels.createCustomDish({name:"",referenceWeight:100,kcal:100,protein:10,fat:5,carbs:20}), null);
