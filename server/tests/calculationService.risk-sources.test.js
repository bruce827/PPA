const calculationService = require('../services/calculationService');
const configModel = require('../models/configModel');
const { computeRatingFactor } = require('../utils/rating');

jest.mock('../models/configModel', () => ({
  getTravelCostPerMonth: jest.fn(),
}));

jest.mock('../utils/rating', () => ({
  computeRatingFactor: jest.fn(),
}));

describe('calculateProjectCost with extended risk sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configModel.getTravelCostPerMonth.mockResolvedValue(8000);
    computeRatingFactor.mockResolvedValue({ factor: 1.25, ratio: 1, maxScore: 100 });
  });

  it('sums risk_scores + ai_unmatched_risks + custom_risk_items', async () => {
    const assessmentData = {
      risk_scores: { A: 10, B: 5 },
      ai_unmatched_risks: [
        { description: 'AI-1', score: 20 },
        { description: 'AI-2', score: 30 },
      ],
      custom_risk_items: [
        { description: 'Custom-1', score: 15 },
      ],
      development_workload: [],
      integration_workload: [],
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      roles: [],
    };

    const result = await calculationService.calculateProjectCost(assessmentData);

    // 风险分应为 10+5+20+30+15 = 80
    expect(result.risk_score).toBe(80);
    expect(computeRatingFactor).toHaveBeenCalledWith(80);
  });

  it('throws 400 when risk_scores has non-numeric', async () => {
    const data = {
      risk_scores: { A: 'xx' },
      ai_unmatched_risks: [],
      custom_risk_items: [],
      development_workload: [],
      integration_workload: [],
    };
    await expect(calculationService.calculateProjectCost(data)).rejects.toMatchObject({
      statusCode: 400,
      name: 'ValidationError',
    });
  });

  it('throws 400 when ai_unmatched_risks is not array or invalid entries', async () => {
    const base = {
      risk_scores: { A: 1 },
      development_workload: [],
      integration_workload: [],
    };

    await expect(
      calculationService.calculateProjectCost({ ...base, ai_unmatched_risks: 'x' })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      calculationService.calculateProjectCost({
        ...base,
        ai_unmatched_risks: [{ description: '', score: 10 }],
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      calculationService.calculateProjectCost({
        ...base,
        ai_unmatched_risks: [{ description: 'AI', score: 200 }],
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when custom_risk_items invalid', async () => {
    const base = {
      risk_scores: { A: 1 },
      development_workload: [],
      integration_workload: [],
    };

    await expect(
      calculationService.calculateProjectCost({ ...base, custom_risk_items: 1 })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      calculationService.calculateProjectCost({
        ...base,
        custom_risk_items: [{ description: 'C1', score: 5 }], // below min 10
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
