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

  it('calculates IoT point integration as an independent cost category', async () => {
    computeRatingFactor.mockResolvedValue({
      factor: 1.2,
      ratio: 0.5,
      maxScore: 100,
    });

    const assessmentData = {
      risk_scores: { A: 10 },
      development_workload: [],
      integration_workload: [
        {
          id: 'legacy-iot-row',
          module1: 'IoT点位对接',
          module2: '旧版合入行',
          delivery_factor: 1,
          workload: 10,
          实施工程师: 10,
        },
        {
          id: 'integration-row',
          module1: '第三方系统对接',
          module2: '接口联调',
          delivery_factor: 1,
          workload: 2,
          实施工程师: 2,
        },
      ],
      iot_point_integration: {
        applied_at: '2026-05-07T00:00:00.000Z',
        generated_items: [
          {
            key: 'point_mapping',
            package_name: '点位映射',
            adjusted_days: 5,
            role_name: '实施工程师',
            delivery_factor: 1,
          },
        ],
      },
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      roles: [{ role_name: '实施工程师', unit_price: 1000 }],
      risk_cost_items: [],
    };

    const result = await calculationService.calculateProjectCost(assessmentData);

    expect(result.system_integration_cost).toBeCloseTo(0.24, 5);
    expect(result.system_integration_workload_days).toBe(2);
    expect(result.iot_point_integration_cost).toBeCloseTo(0.6, 5);
    expect(result.iot_point_integration_workload_days).toBe(5);
    expect(result.total_cost_exact).toBeCloseTo(0.84, 5);
    expect(result.total_workload_days).toBe(7);
  });

  it('keeps legacy IoT integration rows when no independent IoT data exists', async () => {
    const assessmentData = {
      risk_scores: { A: 10 },
      development_workload: [],
      integration_workload: [
        {
          id: 'legacy-iot-row',
          module1: 'IoT点位对接',
          module2: '旧版合入行',
          delivery_factor: 1,
          workload: 4,
          实施工程师: 4,
        },
      ],
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      roles: [{ role_name: '实施工程师', unit_price: 1000 }],
      risk_cost_items: [],
    };

    const result = await calculationService.calculateProjectCost(assessmentData);

    expect(result.system_integration_cost).toBeCloseTo(0.4, 5);
    expect(result.system_integration_workload_days).toBe(4);
    expect(result.iot_point_integration_cost).toBe(0);
    expect(result.total_cost_exact).toBeCloseTo(0.4, 5);
  });

  it('falls back to an existing role when saved IoT role is unavailable', async () => {
    const assessmentData = {
      risk_scores: { A: 10 },
      development_workload: [],
      integration_workload: [],
      iot_point_integration: {
        applied_at: '2026-05-07T00:00:00.000Z',
        generated_items: [
          {
            key: 'point_mapping',
            package_name: '点位映射',
            adjusted_days: 3,
            role_name: '已删除角色',
          },
        ],
      },
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      roles: [{ role_name: '实施工程师', unit_price: 1000 }],
      risk_cost_items: [],
    };

    const result = await calculationService.calculateProjectCost(assessmentData);

    expect(result.iot_point_integration_cost).toBeCloseTo(0.3, 5);
    expect(result.iot_point_integration_workload_days).toBe(3);
  });

  it('ignores legacy IoT delivery factor values', async () => {
    const assessmentData = {
      risk_scores: { A: 10 },
      development_workload: [],
      integration_workload: [],
      iot_point_integration: {
        applied_at: '2026-05-07T00:00:00.000Z',
        generated_items: [
          {
            key: 'point_mapping',
            package_name: '点位映射',
            adjusted_days: 3,
            role_name: '实施工程师',
            delivery_factor: 0,
          },
        ],
      },
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      roles: [{ role_name: '实施工程师', unit_price: 1000 }],
      risk_cost_items: [],
    };

    const result = await calculationService.calculateProjectCost(assessmentData);

    expect(result.iot_point_integration_cost).toBeCloseTo(0.3, 5);
    expect(result.iot_point_integration_workload_days).toBe(3);
    expect(result.total_cost_exact).toBeCloseTo(0.3, 5);
  });

  it('does not include unconfirmed IoT generated items in totals', async () => {
    const assessmentData = {
      risk_scores: { A: 10 },
      development_workload: [],
      integration_workload: [],
      iot_point_integration: {
        generated_items: [
          {
            key: 'point_mapping',
            package_name: '点位映射',
            adjusted_days: 3,
            role_name: '实施工程师',
          },
        ],
      },
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      roles: [{ role_name: '实施工程师', unit_price: 1000 }],
      risk_cost_items: [],
    };

    const result = await calculationService.calculateProjectCost(assessmentData);

    expect(result.iot_point_integration_cost).toBe(0);
    expect(result.iot_point_integration_workload_days).toBe(0);
    expect(result.total_cost_exact).toBe(0);
  });
});
