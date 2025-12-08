type RiskOption = {
  label: string;
  value: number;
};

type RiskItemConfig = API.RiskItemConfig;

type RiskSummaryInput = {
  riskScores: Record<string, number | string | undefined>;
  riskItems: RiskItemConfig[];
};

type RiskSummary = {
  totalScore: number;
  normalizedFactor: number;
  scoreRatio: number;
  maxScore: number;
};

const RISK = {
  // Keep in sync with backend/server/utils/constants.js::RISK
  defaultMaxScore: 100,
  baseThresholdRatio: 0.7,
  midThresholdRatio: 1,
  peakThresholdRatio: 1.2,
  midFactor: 1.2,
  factorCap: 1.5,
  levelThreshold: {
    low: 0.4,
    high: 0.7,
  },
};

export function parseRiskOptions(optionsJson?: string): RiskOption[] {
  if (!optionsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(optionsJson);
    if (Array.isArray(parsed)) {
      return parsed
        .map((option) => {
          const label = option?.label ?? option?.name ?? '';
          const numericValue = Number(option?.score ?? option?.value ?? 0);
          if (!label) {
            return null;
          }
          return {
            label,
            value: Number.isFinite(numericValue) ? numericValue : 0,
          };
        })
        .filter((item): item is RiskOption => Boolean(item));
    }
  } catch (error) {
    return [];
  }

  return [];
}

function computeFactorFromRatio(ratio: number): number {
  const safeRatio = Math.max(0, ratio);

  if (safeRatio <= RISK.baseThresholdRatio) {
    return 1;
  }

  if (safeRatio <= RISK.midThresholdRatio) {
    const span = RISK.midThresholdRatio - RISK.baseThresholdRatio;
    const offset = safeRatio - RISK.baseThresholdRatio;
    const progress = span > 0 ? offset / span : 0;
    return 1 + progress * (RISK.midFactor - 1);
  }

  const cappedRatio = Math.min(safeRatio, RISK.peakThresholdRatio);
  const span = RISK.peakThresholdRatio - RISK.midThresholdRatio;
  const offset = cappedRatio - RISK.midThresholdRatio;
  const progress = span > 0 ? offset / span : 0;
  return Math.min(
    RISK.factorCap,
    RISK.midFactor + progress * (RISK.factorCap - RISK.midFactor),
  );
}

function getRiskMaxScore(riskItems: RiskItemConfig[]): number {
  return riskItems.reduce((acc, item) => {
    const maxOptionScore = parseRiskOptions(item.options_json).reduce(
      (max, option) => {
        return option.value > max ? option.value : max;
      },
      0,
    );
    return acc + maxOptionScore;
  }, 0);
}

export function summarizeRisk({
  riskScores,
  riskItems,
}: RiskSummaryInput): RiskSummary {
  const totalScore = Object.entries(riskScores).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }

    const numericScore = Number(value);
    return Number.isFinite(numericScore) ? acc + numericScore : acc;
  }, 0);

  const rawMaxScore = getRiskMaxScore(riskItems);
  const maxScore = rawMaxScore > 0 ? rawMaxScore : RISK.defaultMaxScore;
  const scoreRatio = maxScore > 0 ? totalScore / maxScore : 0;
  const normalizedFactor = computeFactorFromRatio(scoreRatio);

  return {
    totalScore,
    normalizedFactor,
    scoreRatio,
    maxScore,
  };
}

export function deduceRiskLevel(scoreRatio: number): string {
  if (scoreRatio >= RISK.levelThreshold.high) {
    return '高风险';
  }

  if (scoreRatio >= RISK.levelThreshold.low) {
    return '中风险';
  }

  return '低风险';
}
