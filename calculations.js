const WellBodyCalculations = (() => {
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
    if (plannedLoss <= 0 || totalDays <= 0) return null;
    return Math.round(tdee - ((plannedLoss * 7000) / totalDays));
  }

  function calculatePfcTargets(targetCal) {
    return {
      p: Number((targetCal * 0.4 / 4).toFixed(1)),
      f: Number((targetCal * 0.2 / 9).toFixed(1)),
      c: Number((targetCal * 0.4 / 4).toFixed(1))
    };
  }

  function calculateProgress(startWeight, currentWeight, goalWeight) {
    const total = Math.max(0.1, startWeight - goalWeight);
    const lost = startWeight - currentWeight;
    return Math.max(0, Math.min(100, lost / total * 100));
  }

  function calculateRemainingWeight(currentWeight, goalWeight) {
    return Math.max(0, currentWeight - goalWeight);
  }

  function calculatePace(startWeight, currentWeight, elapsedDays) {
    return elapsedDays > 0 ? (startWeight - currentWeight) / elapsedDays * 7 : 0;
  }

  function calculatePlannedPace(startWeight, goalWeight, totalDays) {
    const plannedLoss = startWeight - goalWeight;
    return totalDays > 0 ? plannedLoss / (totalDays / 7) : null;
  }

  function calculatePlannedDifference(startWeight, goalWeight, currentWeight, totalDays, elapsedDays) {
    if (totalDays <= 0) return null;
    const plannedLoss = startWeight - goalWeight;
    const plannedToday = plannedLoss * (elapsedDays / totalDays);
    return (startWeight - currentWeight) - plannedToday;
  }

  return {
    calculateBmr,
    calculateTdee,
    calculateTargetCalorie,
    calculatePfcTargets,
    calculateProgress,
    calculateRemainingWeight,
    calculatePace,
    calculatePlannedPace,
    calculatePlannedDifference
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = WellBodyCalculations;
}
if (typeof window !== "undefined") {
  window.WellBodyCalculations = WellBodyCalculations;
}
