const configModel = require('../models/configModel');
const { RISK } = require('./constants');

function getMaxScoreFromRiskItems(riskItems = []) {
  return riskItems.reduce((acc, item) => {
    if (!item?.options_json) {
      return acc;
    }

    try {
      const options = JSON.parse(item.options_json);
      if (Array.isArray(options)) {
        const maxOption = options.reduce((max, option) => {
          const value = Number(option?.score ?? option?.value ?? 0);
          return Number.isFinite(value) && value > max ? value : max;
        }, 0);
        return acc + maxOption;
      }
    } catch (error) {
      return acc;
    }

    return acc;
  }, 0);
}

function computeFactorFromRatio(ratio) {
  const safeRatio = Math.max(0, ratio);

  if (safeRatio <= RISK.BASE_THRESHOLD_RATIO) {
    return 1;
  }

  if (safeRatio <= RISK.MID_THRESHOLD_RATIO) {
    const span = RISK.MID_THRESHOLD_RATIO - RISK.BASE_THRESHOLD_RATIO;
    const offset = safeRatio - RISK.BASE_THRESHOLD_RATIO;
    const progress = span > 0 ? offset / span : 0;
    return 1 + progress * (RISK.MID_FACTOR - 1);
  }

  const cappedRatio = Math.min(safeRatio, RISK.PEAK_THRESHOLD_RATIO);
  const span = RISK.PEAK_THRESHOLD_RATIO - RISK.MID_THRESHOLD_RATIO;
  const offset = cappedRatio - RISK.MID_THRESHOLD_RATIO;
  const progress = span > 0 ? offset / span : 0;
  return Math.min(RISK.FACTOR_CAP, RISK.MID_FACTOR + progress * (RISK.FACTOR_CAP - RISK.MID_FACTOR));
}

async function computeRatingFactor(riskScore) {
  const riskItems = await configModel.getAllRiskItems();
  const rawMaxScore = getMaxScoreFromRiskItems(riskItems);
  const maxScore = rawMaxScore > 0 ? rawMaxScore : RISK.DEFAULT_MAX_SCORE;
  const ratio = maxScore > 0 ? Math.max(0, Number(riskScore) || 0) / maxScore : 0;
  const factor = computeFactorFromRatio(ratio);

  return {
    factor,
    ratio,
    maxScore
  };
}

module.exports = {
  computeRatingFactor,
  getMaxScoreFromRiskItems
};
