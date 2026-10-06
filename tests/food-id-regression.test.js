const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync(require.resolve("../index.html"), "utf8");

assert.ok(index.includes('document.getElementById("foodSelect").value=hit.foodId'));
assert.match(index, /createFood\(\{foodId:"chicken"/);
assert.match(index, /createFood\(\{foodId:"apple"/);
