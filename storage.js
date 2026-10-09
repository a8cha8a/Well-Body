const WellBodyStorage = (() => {
  const KEYS = {
    plan: "wellBodyPlan",
    weightRecords: "wellBodyWeightRecords",
    meals: "wellBodyMeals",
    customDishes: "wellBodyCustomDishes"
  };
  // Shared across create() calls, but isolated for each injected test backend.
  const sessions = new WeakMap();
  const unavailableStates = {};
  const object = value => !!value && typeof value === "object" && !Array.isArray(value);
  const date = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const optionalNumber = value => value == null || Number.isFinite(value);
  const types = ["breakfast", "lunch", "snack", "dinner"];
  function validMeal(value) {
    if (!object(value) || !date(value.date) || typeof value.type !== "string") return false;
    if (Array.isArray(value.items)) {
      return types.includes(value.type) && value.items.every(item => object(item) &&
        typeof item.foodId === "string" && optionalNumber(item.grams) &&
        [item.kcal,item.protein,item.fat,item.carbs].every(optionalNumber));
    }
    // Older records may contain an unknown food, type or quantity. Retain them.
    return typeof value.foodId === "string" && Object.prototype.hasOwnProperty.call(value,"grams") &&
      (value.grams == null || Number.isFinite(Number(value.grams)));
  }
  const validators = {
    [KEYS.plan]: value => object(value) && ["male","female"].includes(value.sex) &&
      [value.age,value.height,value.startWeight,value.goalWeight,value.activity].every(Number.isFinite) &&
      [value.startDate,value.goalDate].every(v => v === undefined || v === "" || date(v)),
    [KEYS.weightRecords]: value => Array.isArray(value) && value.every(v => object(v) && date(v.date) && Number.isFinite(v.weight)),
    [KEYS.meals]: value => Array.isArray(value) && value.every(validMeal),
    [KEYS.customDishes]: value => Array.isArray(value) && value.every(v => object(v) &&
      typeof v.name === "string" && !!v.name.trim() && Number.isFinite(Number(v.referenceWeight)) && Number(v.referenceWeight)>0 &&
      [v.kcal,v.protein,v.fat,v.carbs].every(n => n !== null && n !== undefined && n !== "" && Number.isFinite(Number(n)) && Number(n)>=0) &&
      (v.aliases === undefined || Array.isArray(v.aliases)))
  };

  function create(backend) {
    let storage = null;
    try { storage = backend || (typeof localStorage !== "undefined" ? localStorage : null); } catch (_) {}
    let states = unavailableStates;
    if (storage) {
      if (!sessions.has(storage)) sessions.set(storage, {});
      states = sessions.get(storage);
    }
    function state(key) { return states[key] || "unchecked"; }
    function canWrite(key) { return ["missing","ready"].includes(state(key)); }
    function get(key, fallback) {
      if (!storage) { states[key]="read-error"; return {ok:false,value:fallback}; }
      let raw;
      try { raw=storage.getItem(key); } catch (_) {
        states[key]="read-error"; return {ok:false,value:fallback};
      }
      if (raw === null) { states[key]="missing"; return {ok:true,value:fallback}; }
      let value;
      try { value=JSON.parse(raw); } catch (_) {
        states[key]="invalid"; return {ok:false,value:fallback};
      }
      if (!validators[key](value)) { states[key]="invalid"; return {ok:false,value:fallback}; }
      states[key]="ready";
      return {ok:true,value};
    }
    function set(key, value) {
      if (!storage || !canWrite(key) || !validators[key](value)) return false;
      try { storage.setItem(key, JSON.stringify(value)); states[key]="ready"; return true; }
      catch (_) { return false; }
    }
    function remove(key) {
      if (!storage || !canWrite(key)) return false;
      try { storage.removeItem(key); states[key]="missing"; return true; }
      catch (_) { return false; }
    }
    return {
      getState: state,
      canWrite,
      rejectRead(key) { if (validators[key]) states[key]="invalid"; },
      getPlan() { return get(KEYS.plan,null); },
      savePlan(value) { return set(KEYS.plan,value); },
      getWeightRecords() { return get(KEYS.weightRecords,[]); },
      saveWeightRecords(value) { return set(KEYS.weightRecords,value); },
      getMeals() { return get(KEYS.meals,[]); },
      saveMeals(value) { return set(KEYS.meals,value); },
      getCustomDishes() { return get(KEYS.customDishes,[]); },
      saveCustomDishes(value) { return set(KEYS.customDishes,value); },
      clearPlan() { return remove(KEYS.plan); },
      clearWeightRecords() { return remove(KEYS.weightRecords); },
      clearMeals() { return remove(KEYS.meals); },
      clearCustomDishes() { return remove(KEYS.customDishes); }
    };
  }
  return { KEYS, create };
})();
if (typeof module !== "undefined" && module.exports) module.exports=WellBodyStorage;
if (typeof window !== "undefined") window.WellBodyStorage=WellBodyStorage;
