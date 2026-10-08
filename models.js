const WellBodyModels = (() => {
  const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"];

  function createFood(data) {
    return {
      foodId: data.foodId,
      name: data.name,
      category: data.category,
      state: data.state,
      referenceWeight: Number(data.referenceWeight),
      kcal: data.kcal == null ? null : Number(data.kcal),
      protein: data.protein == null ? null : Number(data.protein),
      fat: data.fat == null ? null : Number(data.fat),
      carbs: data.carbs == null ? null : Number(data.carbs),
      ...(data.nutritionStatus ? { nutritionStatus: data.nutritionStatus } : {}),
      source: data.source,
      dataVersion: data.dataVersion
    };
  }

  function createCustomDish(data) {
    if (!data || typeof data.name !== "string" || !data.name.trim()) return null;
    const referenceWeight = Number(data.referenceWeight);
    const rawNutrition = [data.kcal, data.protein, data.fat, data.carbs];
    if (rawNutrition.some(v => v === null || v === undefined || v === "")) return null;
    const nutrition = rawNutrition.map(Number);
    if (!Number.isFinite(referenceWeight) || referenceWeight <= 0 || !nutrition.every(v => Number.isFinite(v) && v >= 0)) return null;
    return {
      dishId: data.dishId || null,
      name: data.name.trim(),
      aliases: Array.isArray(data.aliases) ? data.aliases.map(v => String(v).trim()).filter(Boolean) : [],
      referenceWeight,
      kcal: nutrition[0],
      protein: nutrition[1],
      fat: nutrition[2],
      carbs: nutrition[3],
      source: data.source || "user",
      confidence: data.confidence || "confirmed",
      ...(data.sourceUrl ? { sourceUrl: String(data.sourceUrl) } : {})
    };
  }

  function customDishToFood(dish) {
    if (!dish || !dish.dishId) return null;
    return createFood({
      foodId: "custom:" + dish.dishId,
      name: dish.name,
      category: "custom-dish",
      state: "prepared",
      referenceWeight: dish.referenceWeight,
      kcal: dish.kcal,
      protein: dish.protein,
      fat: dish.fat,
      carbs: dish.carbs,
      source: "custom-dish:" + dish.source,
      dataVersion: "custom-1"
    });
  }

  function calculateSnapshot(food, grams) {
    const weight = Number(grams);
    if (!food || !Number.isFinite(weight) || weight <= 0) return null;
    if (![food.kcal, food.protein, food.fat, food.carbs].every(Number.isFinite)) return null;
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
    if (!snapshot) return null;
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
        mealId: "legacy-" + legacyIndex,
        date: value.date,
        type: value.type,
        items: [{
          foodId: value.foodId,
          grams,
          kcal: null,
          protein: null,
          fat: null,
          carbs: null,
          foodDataVersion: null,
          nutritionStatus: "unknown"
        }]
      };
    }
    const item = createMealItem(food, grams);
    return {
      mealId: "legacy-" + legacyIndex,
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
    createCustomDish,
    customDishToFood,
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
