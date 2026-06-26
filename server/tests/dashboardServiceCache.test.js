describe('dashboardService cache query selection', () => {
  let dashboardModel;
  let configModel;
  let dashboardService;

  const loadService = () => {
    jest.resetModules();

    jest.doMock('../utils/logger', () => ({
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    }));

    jest.doMock('../services/contractsService', () => ({
      getContractsTotalRowCount: jest.fn().mockResolvedValue(0),
    }));

    jest.doMock('../models/dashboardModel', () => ({
      getAllProjectTextData: jest.fn().mockResolvedValue([
        {
          name: '数字孪生项目',
          description: 'GIS BIM 数据采集',
        },
      ]),
      getAllAssessmentDetails: jest.fn().mockResolvedValue([
        {
          assessment_details_json: JSON.stringify({
            risk_scores: {
              '需求频繁变更': 40,
              '未配置风险': 50,
            },
            risk_items: [
              {
                item_name: '技术方案不明确',
              },
            ],
          }),
          final_total_cost: 100,
          final_risk_score: 40,
          final_workload_days: 30,
        },
      ]),
      getAllDashboardProjectData: jest.fn().mockResolvedValue([]),
      getOverviewMetrics: jest.fn().mockResolvedValue({}),
      getCostRangeBuckets: jest.fn().mockResolvedValue({}),
      getTrendLast12Months: jest.fn().mockResolvedValue([]),
    }));

    jest.doMock('../models/configModel', () => ({
      getAllRiskItems: jest.fn().mockResolvedValue([
        { item_name: '需求频繁变更' },
        { item_name: '技术方案不明确' },
      ]),
    }));

    dashboardModel = require('../models/dashboardModel');
    configModel = require('../models/configModel');
    dashboardService = require('../services/dashboardService');
  };

  beforeEach(() => {
    loadService();
  });

  afterEach(() => {
    jest.dontMock('../utils/logger');
    jest.dontMock('../services/contractsService');
    jest.dontMock('../models/dashboardModel');
    jest.dontMock('../models/configModel');
  });

  test('keywords uses the text-only project query', async () => {
    const keywords = await dashboardService.getKeywords();

    expect(keywords.length).toBeGreaterThan(0);
    expect(dashboardModel.getAllProjectTextData).toHaveBeenCalledTimes(1);
    expect(dashboardModel.getAllAssessmentDetails).not.toHaveBeenCalled();
    expect(dashboardModel.getAllDashboardProjectData).not.toHaveBeenCalled();
  });

  test('top risks reuses assessment details and risk whitelist within cache ttl', async () => {
    const first = await dashboardService.getTopRisks();
    const second = await dashboardService.getTopRisks();

    expect(first).toEqual(second);
    expect(first).toEqual([
      { risk_name: '技术方案不明确', count: 1 },
      { risk_name: '需求频繁变更', count: 1 },
    ]);
    expect(configModel.getAllRiskItems).toHaveBeenCalledTimes(1);
    expect(dashboardModel.getAllAssessmentDetails).toHaveBeenCalledTimes(1);
    expect(dashboardModel.getAllDashboardProjectData).not.toHaveBeenCalled();
  });
});
