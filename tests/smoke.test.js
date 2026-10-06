const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const calculations = fs.readFileSync("calculations.js", "utf8");

for (const id of [
  "sex","age","height","startWeight","startDate","goalDate","goalInput","activity",
  "bmr","tdee","targetCal","scheduleSummary","current","goal","left","progress",
  "recordDate","recordWeight","history","dashboardWeight","dashboardGoal","dashboardLeft",
  "dashboardProgress","dashboardPercent","dashboardKcal","dashboardP","dashboardF","dashboardC",
  "remainingCalories","remainingP","remainingF","remainingC","calorieRate","mealType",
  "foodSelect","foodGrams","mealHistory","todayCalories","todayP","todayF","todayC","weightChart"
]) {
  assert.match(html, new RegExp('id="' + id + '"'));
}

for (const key of ["wellBodyPlan","wellBodyWeightRecords","wellBodyMeals"]) {
  assert.ok(html.includes('"' + key + '"'));
}

for (const fn of ["calculate","updateSchedule","updateProgress","recordWeight","renderMeals","renderHistory","renderChart","updateDashboard"]) {
  assert.ok(html.includes("function " + fn + "("));
}

assert.match(calculations, /plannedLoss \* 7000/);
assert.match(html, /const elapsed=Math\.max\(0,Math\.round\(\(now-s\)\/86400000\)\)/);
assert.match(html, /Number\.isFinite\(target\)/);
