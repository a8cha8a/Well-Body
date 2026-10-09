const assert = require("node:assert/strict");
const WellBodyStorage = require("../storage.js");

function createStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

const storage = createStorage();
const api = WellBodyStorage.create(storage);

const plan = { sex: "male", age: 36, height: 170, startWeight: 75, goalWeight: 67, activity: 1.55, startDate: "2026-10-01", goalDate: "2026-12-31" };
const records = [{ date: "2026-10-01", weight: 75 }];
const meals = [{ date: "2026-10-01", type: "breakfast", foodId: "egg", grams: 100 }];

api.getPlan();api.getWeightRecords();api.getMeals();
assert.equal(api.savePlan(plan), true);
assert.equal(api.saveWeightRecords(records), true);
assert.equal(api.saveMeals(meals), true);

assert.deepEqual(api.getPlan(), { ok: true, value: plan });
assert.deepEqual(api.getWeightRecords(), { ok: true, value: records });
assert.deepEqual(api.getMeals(), { ok: true, value: meals });

// The Storage API must preserve the existing localStorage keys.
assert.deepEqual(JSON.parse(storage.getItem("wellBodyPlan")), plan);
assert.deepEqual(JSON.parse(storage.getItem("wellBodyWeightRecords")), records);
assert.deepEqual(JSON.parse(storage.getItem("wellBodyMeals")), meals);

// Save -> get -> compare, including nested data.
const nestedMeals = [
  {
    date: "2026-10-02",
    type: "dinner",
    foodId: "rice",
    grams: 180
  }
];
assert.equal(api.saveMeals(nestedMeals), true);
assert.deepEqual(api.getMeals().value, nestedMeals);

// Existing data is readable without migration or schema changes.
assert.deepEqual(api.getPlan().value.goalWeight, 67);
assert.deepEqual(api.getWeightRecords().value[0], { date: "2026-10-01", weight: 75 });
assert.deepEqual(api.getMeals().value[0].date, "2026-10-02");

// Read failures must not be reported as successful reads.
const brokenStorage = {
  getItem() { throw new Error("read failure"); },
  setItem() { throw new Error("write failure"); },
  removeItem() { throw new Error("remove failure"); }
};
const brokenApi = WellBodyStorage.create(brokenStorage);
assert.equal(brokenApi.getPlan().ok, false);
assert.equal(brokenApi.savePlan(plan), false);
assert.equal(brokenApi.getWeightRecords().ok, false);
assert.equal(brokenApi.saveWeightRecords(records), false);
assert.equal(brokenApi.getMeals().ok, false);
assert.equal(brokenApi.saveMeals(meals), false);

// Clear operations are explicit and are not part of normal save flows.
assert.equal(api.clearPlan(), true);
assert.equal(api.clearWeightRecords(), true);
assert.equal(api.clearMeals(), true);
assert.equal(storage.getItem("wellBodyPlan"), null);
assert.equal(storage.getItem("wellBodyWeightRecords"), null);
assert.equal(storage.getItem("wellBodyMeals"), null);

// Missing keys return defaults.
assert.deepEqual(api.getPlan(), { ok: true, value: null });
assert.deepEqual(api.getWeightRecords(), { ok: true, value: [] });
assert.deepEqual(api.getMeals(), { ok: true, value: [] });


// Custom dishes use an isolated key and must not alter existing data.
const customDishes = [{dishId:"custom-1",name:"親子丼",referenceWeight:300,kcal:520,protein:24,fat:14,carbs:72,source:"user",confidence:"confirmed"}];
api.getCustomDishes();
assert.equal(api.saveCustomDishes(customDishes), true);
assert.deepEqual(api.getCustomDishes(), { ok: true, value: customDishes });
assert.deepEqual(JSON.parse(storage.getItem("wellBodyCustomDishes")), customDishes);
assert.equal(storage.getItem("wellBodyPlan"), null);
assert.equal(storage.getItem("wellBodyWeightRecords"), null);
assert.equal(storage.getItem("wellBodyMeals"), null);
assert.equal(api.clearCustomDishes(), true);
assert.deepEqual(api.getCustomDishes(), { ok: true, value: [] });
assert.equal(brokenApi.getCustomDishes().ok, false);
assert.equal(brokenApi.saveCustomDishes(customDishes), false);
