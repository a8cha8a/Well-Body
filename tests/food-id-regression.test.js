const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync(require.resolve("../index.html"), "utf8");

assert.match(index, /foodSelect\").value=hit\.foodId/);
assert.doesNotMatch(index, /\bf\.id\b|\bfood\.id\b|\bhit\.id\b/);
assert.match(index, /createFood\(\{foodId:"chicken"/);\nassert.match(index, /createFood\(\{foodId:"apple"/);
assert.match(index, /food\.foodId/);
assert.match(index, /foodDataVersion/);
assert.match(index, /kcal/);
assert.match(index, /protein/);
assert.match(index, /fat/);
assert.match(index, /carbs/);
assert.match(index, /不明な食品/);
