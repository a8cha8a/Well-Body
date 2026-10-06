const assert = require("node:assert/strict");

function calculateBmr(sex, weight, height, age) {
  return sex === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateTdee(bmr, activity) {
  return bmr * activity;
}

function calculateTargetCalorie(tdee, startWeight, goalWeight, totalDays) {
  const plannedLoss = startWeight - goalWeight;
  if (plannedLoss === 0 || plannedLoss < 0 || totalDays <= 0) return null;
  return Math.round(tdee - (plannedLoss * 7000) / totalDays);
}

function calculatePfcTargets(targetCal) {
  return {
    p: Number((targetCal * 0.4 / 4).toFixed(1)),
    f: Number((targetCal * 0.2 / 9).toFixed(1)),
    c: Number((targetCal * 0.4 / 4).toFixed(1)),
  };
}

function calculateProgress(startWeight, currentWeight, goalWeight) {
  const total = Math.max(0.1, startWeight - goalWeight);
  const lost = startWeight - currentWeight;
  return Math.max(0, Math.min(100, (lost / total) * 100));
}

function calculateRemaining(currentWeight, goalWeight) {
  return Math.max(0, currentWeight - goalWeight);
}

function calculatePace(startWeight, currentWeight, elapsedDays) {
  if (elapsedDays <= 0) return 0;
  return ((startWeight - currentWeight) / elapsedDays) * 7;
}

// BMR / TDEE
assert.equal(calculateBmr("male", 75, 170, 36), 1637.5);
assert.equal(Math.round(calculateTdee(1637.5, 1.55)), 2538);

// Phase 2A target calorie formula
assert.equal(calculateTargetCalorie(2538.125, 75, 67, 100), 1978);
assert.equal(calculateTargetCalorie(2538.125, 75, 75, 100), null);
assert.equal(calculateTargetCalorie(2538.125, 75, 76, 100), null);
assert.equal(calculateTargetCalorie(2538.125, 75, 67, 0), null);
assert.equal(calculateTargetCalorie(2538.125, 75, 67, -1), null);

// PFC 40:20:40
assert.deepEqual(calculatePfcTargets(2000), { p: 200, f: 44.4, c: 200 });

// Progress / remaining
assert.equal(Math.round(calculateProgress(75, 71, 67)), 50);
assert.equal(calculateRemaining(71, 67), 4);
assert.equal(calculateRemaining(65, 67), 0);

// Phase 2B pace boundary behavior
assert.equal(calculatePace(75, 75, 0), 0);
assert.equal(calculatePace(75, 74, 7), 1);
assert.equal(calculatePace(75, 70, 35), 1);
assert.equal(calculatePace(75, 70, 70), 0.5);
