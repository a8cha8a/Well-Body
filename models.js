const WellBodyModels = (() => {
  const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"];

  function createFood(data) {
    return {
      foodId: data.foodId,
      name: data.name,
      category: data.category,
      state: data.state,
      referenceWeight: Number(data.referenceWeight),
      kcal: Number(data.kcal),
      protein: Number(data.protein),
      fat: Number(data.fat),
      carbs: Number(data.carbs),
      source: data.source,
      dataVersion: data.dataVersion
    };
  }

  function calculateSnapshot(food, grams) {
    const weight = Number(grams);
    if (!food || !Number.isFinite(weight) || weight <= 0) return null;
    const ratio = weight / food.referenceWeight;
    return {
      kcal: food.kcal * ratio,
      protein: food.protein * ratio,
      fat: food.fat * ratio,
      carbs: food.carbs * ratio
    };
  }

  function createMealItem(food, grams) {
    const weight = Number(grams);
    if (!food || !Number.isFinite(weight) || weight <= 0) return null;
    const snapshot = calculateSnapshot(food, weight);
    return {
      foodId: food.foodId,
      grams: weight,
      kcal: snapshot.kcal,
      protein: snapshot.protein,
      fat: snapshot.fat,
      carbs: snapshot.carbs,
      foodDataVersion: food.dataVersion
    };
  }

  function createMeal(data) {
    if (!data || !MEAL_TYPES.includes(data.type) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;
    const items = Array.isArray(data.items) ? data.items.filter(Boolean) : [];
    return {
      mealId: data.mealId || null,
      date: data.date,
      type: data.type,
      items
    };
  }

  function isLegacyMeal(value) {
    return !!value &&
      typeof value.date === "string" &&
      typeof value.type === "string" &&
      typeof value.foodId === "string" &&
      Object.prototype.hasOwnProperty.call(value, "grams") &&
      !Array.isArray(value.items);
  }

  function fromLegacyMeal(value, foodMap, legacyIndex) {
    if (!isLegacyMeal(value)) return null;
    const food = foodMap.get(value.foodId);
    const grams = Number(value.grams);
    if (!food || !Number.isFinite(grams) || grams <= 0 || !MEAL_TYPES.includes(value.type)) {
      return {
        mealId: null,
        date: value.date,
        type: value.type,
        items: []
      };
    }
    const item = createMealItem(food, grams);
    return {
      mealId: null,
      date: value.date,
      type: value.type,
      items: item ? [item] : []
    };
  }

  function normalizeMeals(values, foodMap) {
    if (!Array.isArray(values)) return [];
    const result = [];
    values.forEach((value, index) => {
      if (isLegacyMeal(value)) {
        const meal = fromLegacyMeal(value, foodMap, index);
        if (meal) result.push(meal);
        return;
      }
      if (value && Array.isArray(value.items)) {
        const meal = createMeal(value);
        if (meal) result.push(meal);
      }
    });
    return result;
  }

  function toDailyNutrition(meals) {
    const totals = new Map();
    (Array.isArray(meals) ? meals : []).forEach(meal => {
      if (!meal || !meal.date) return;
      if (!totals.has(meal.date)) {
        totals.set(meal.date, {
          date: meal.date,
          kcal: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
          mealCount: 0
        });
      }
      const daily = totals.get(meal.date);
      daily.mealCount += 1;
      (meal.items || []).forEach(item => {
        if (!Number.isFinite(item.kcal) ||
            !Number.isFinite(item.protein) ||
            !Number.isFinite(item.fat) ||
            !Number.isFinite(item.carbs)) return;
        daily.kcal += item.kcal;
        daily.protein += item.protein;
        daily.fat += item.fat;
        daily.carbs += item.carbs;
      });
    });
    return Array.from(totals.values());
  }

  return {
    MEAL_TYPES,
    createFood,
    calculateSnapshot,
    createMealItem,
    createMeal,
    isLegacyMeal,
    fromLegacyMeal,
    normalizeMeals,
    toDailyNutrition
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = WellBodyModels;
}
if (typeof window !== "undefined") {
  window.WellBodyModels = WellBodyModels;
}
