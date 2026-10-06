const assert = require("node:assert/strict");

function createStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

const storage = createStorage();
const plan = { sex: "male", age: 36, height: 170, startWeight: 75, goalWeight: 67, activity: 1.55, startDate: "2026-10-01", goalDate: "2026-12-31" };
const records = [{ date: "2026-10-01", weight: 75 }];
const meals = [{ date: "2026-10-01", type: "breakfast", foodId: "egg", grams: 100 }];

storage.setItem("wellBodyPlan", JSON.stringify(plan));
storage.setItem("wellBodyWeightRecords", JSON.stringify(records));
storage.setItem("wellBodyMeals", JSON.stringify(meals));

assert.deepEqual(JSON.parse(storage.getItem("wellBodyPlan")), plan);
assert.deepEqual(JSON.parse(storage.getItem("wellBodyWeightRecords")), records);
assert.deepEqual(JSON.parse(storage.getItem("wellBodyMeals")), meals);
assert.equal(storage.getItem("wellBodyPlan") !== null, true);
assert.equal(storage.getItem("wellBodyWeightRecords") !== null, true);
assert.equal(storage.getItem("wellBodyMeals") !== null, true);
