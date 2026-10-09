const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const storage = require('../storage.js');
const index = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const start = index.indexOf('function recordWeight(){');
const end = index.indexOf('\nfunction renderChart(){', start);
assert.ok(start >= 0 && end > start);

for (const update of [false, true]) {
  for (const fail of [false, true]) {
    test(`recordWeight: ${update ? 'same-date update' : 'new record'}, save ${fail ? 'failure' : 'success'}`, () => {
      const original = [{date:'2020-01-01',weight:80}];
      const raw = JSON.stringify(original);
      const data = new Map([['wellBodyWeightRecords', raw]]);
      let saves = 0, renders = 0;
      const backend = {
        getItem: key => data.get(key) ?? null,
        setItem(key, value) { saves++; if (fail) throw Error('synthetic write failure'); data.set(key, value); }
      };
      const api = storage.create(backend);
      // Required by the later read-protection implementation; harmless on PR #21.
      api.getWeightRecords();
      const nodes = {
        recordDate:{value:update ? '2020-01-01' : '2020-01-02'},
        recordWeight:{value:'79.5'}, recordMessage:{textContent:'previous success'}
      };
      const context = vm.createContext({
        records: original, document:{getElementById:id=>nodes[id]},
        WellBodyStorage:{KEYS:storage.KEYS,create:()=>api},
        calculate:()=>{renders++;}, renderHistory:()=>{renders++;}, renderChart:()=>{renders++;}
      });
      vm.runInContext(index.slice(start, end), context);
      vm.runInContext('recordWeight()', context);
      assert.equal(saves, 1);
      assert.equal(nodes.recordWeight.value, '79.5');
      assert.equal(nodes.recordDate.value, update ? '2020-01-01' : '2020-01-02');
      assert.deepEqual(original, [{date:'2020-01-01',weight:80}]);
      if (fail) {
        assert.equal(context.records, original);
        assert.equal(data.get('wellBodyWeightRecords'), raw);
        assert.equal(renders, 0);
        assert.match(nodes.recordMessage.textContent, /保存できませんでした/);
        assert.doesNotMatch(nodes.recordMessage.textContent, /記録しました/);
      } else {
        const records = JSON.parse(JSON.stringify(context.records));
        assert.deepEqual(records, update ? [{date:'2020-01-01',weight:79.5}] : [...original,{date:'2020-01-02',weight:79.5}]);
        assert.deepEqual(JSON.parse(data.get('wellBodyWeightRecords')), records);
        assert.equal(renders, 3);
        assert.match(nodes.recordMessage.textContent, /記録しました/);
      }
    });
  }
}
