const assert = require("node:assert/strict");
const calc = require("../calculations.js");

// BMR / TDEE
assert.equal(calc.calculateBmr("male", 75, 170, 36), 1637.5);
assert.equal(Math.round(calc.calculateTdee(1637.5, 1.55)), 2538);

// Phase 2A target calorie formula
assert.equal(calc.calculateTargetCalorie(2538.125, 75, 67, 100), 1978);
assert.equal(calc.calculateTargetCalorie(2538.125, 75, 75, 100), null);
assert.equal(calc.calculateTargetCalorie(2538.125, 75, 76, 100), null);
assert.equal(calc.calculateTargetCalorie(2538.125, 75, 67, 0), null);
assert.equal(calc.calculateTargetCalorie(2538.125, 75, 67, -1), null);

// PFC 40:20:40
assert.deepEqual(calc.calculatePfcTargets(2000), { p: 200, f: 44.4, c: 200 });

// Progress / remaining
assert.equal(Math.round(calc.calculateProgress(75, 71, 67)), 50);
assert.equal(calc.calculateRemainingWeight(71, 67), 4);
assert.equal(calc.calculateRemainingWeight(65, 67), 0);

// Phase 2B pace / planned difference
assert.equal(calc.calculatePace(75, 75, 0), 0);
assert.equal(calc.calculatePace(75, 74, 7), 1);
assert.equal(calc.calculatePace(75, 70, 35), 1);
assert.equal(calc.calculatePace(75, 70, 70), 0.5);
assert.equal(calc.calculatePlannedPace(75, 67, 56), 1);
assert.equal(calc.calculatePlannedDifference(75, 67, 73, 28, 14), 2);
