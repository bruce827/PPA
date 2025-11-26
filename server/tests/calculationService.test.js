const calculationService = require('../services/calculationService');
const configModel = require('../models/configModel');
const { computeRatingFactor } = require('../utils/rating');

jest.mock('../models/configModel', () => ({
  getTravelCostPerMonth: jest.fn(),
}));

jest.mock('../utils/rating', () => ({
  computeRatingFactor: jest.fn(),
}));

describe('calculationService.calculateProjectCost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configModel.getTravelCostPerMonth.mockResolvedValue(8000);
    computeRatingFactor.mockResolvedValue({
      factor: 1,
      ratio: 0.5,
      maxScore: 100,
    });
  });

  it('includes risk_cost_items and legacy risk items when calculating totals', async () => {
    const assessmentData = {
      risk_scores: { A: 10 },
      development_workload: [],
      integration_workload: [],
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      roles: [],
      risk_cost_items: [{ description: 'RC1', cost: 2.5 }],
      other_costs: {
        risk_items: [{ title: 'RC2', estimated_cost: 1.2 }],
      },
      risk_items: [{ name: 'RC3', value: 0.3 }],
    };

    const result = await calculationService.calculateProjectCost(assessmentData);

    expect(result.risk_cost).toBeCloseTo(4.0, 5);
    expect(result.total_cost_exact).toBeCloseTo(4.0, 5);
    expect(result.total_cost).toBe(4);
    expect(result.risk_score).toBe(10);
    expect(computeRatingFactor).toHaveBeenCalledWith(10);
  });
});
