const WellBodyStorage = (() => {
  const KEYS = {
    plan: "wellBodyPlan",
    weightRecords: "wellBodyWeightRecords",
    meals: "wellBodyMeals"
  };

  function create(backend) {
    const storage = backend || (typeof localStorage !== "undefined" ? localStorage : null);

    function get(key, fallback) {
      if (!storage) return { ok: false, value: fallback };
      try {
        const raw = storage.getItem(key);
        if (raw === null) return { ok: true, value: fallback };
        return { ok: true, value: JSON.parse(raw) };
      } catch (error) {
        return { ok: false, value: fallback };
      }
    }

    function set(key, value) {
      if (!storage) return false;
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        return false;
      }
    }

    return {
      getPlan() {
        return get(KEYS.plan, null);
      },
      savePlan(value) {
        return set(KEYS.plan, value);
      },
      getWeightRecords() {
        return get(KEYS.weightRecords, []);
      },
      saveWeightRecords(value) {
        return set(KEYS.weightRecords, value);
      },
      getMeals() {
        return get(KEYS.meals, []);
      },
      saveMeals(value) {
        return set(KEYS.meals, value);
      }
    };
  }

  return { KEYS, create };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = WellBodyStorage;
}
if (typeof window !== "undefined") {
  window.WellBodyStorage = WellBodyStorage;
}
