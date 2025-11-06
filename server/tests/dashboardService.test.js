const dashboardService = require('../services/dashboardService');
const db = require('../utils/db');

// Mock the database module
jest.mock('../utils/db');

describe('Dashboard Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return total projects and average cost', async () => {
      db.get
        .mockResolvedValueOnce({ count: 10 })
        .mockResolvedValueOnce({ avgCost: 125000.5 });

      const result = await dashboardService.getSummary();

      expect(result).toEqual({
        totalProjects: 10,
        averageCost: '125000.50',
      });
      expect(db.get).toHaveBeenCalledTimes(2);
    });

    it('should handle empty database', async () => {
      db.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await dashboardService.getSummary();

      expect(result).toEqual({
        totalProjects: 0,
        averageCost: 0,
      });
    });

    it('should handle zero projects', async () => {
      db.get
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ avgCost: null });

      const result = await dashboardService.getSummary();

      expect(result).toEqual({
        totalProjects: 0,
        averageCost: 0,
      });
    });
  });

  describe('getRiskDistribution', () => {
    it('should return risk distribution grouped by score', async () => {
      const mockData = [
        { final_risk_score: 10, count: 5 },
        { final_risk_score: 25, count: 3 },
        { final_risk_score: 45, count: 2 },
      ];
      db.all.mockResolvedValue(mockData);

      const result = await dashboardService.getRiskDistribution();

      expect(result).toEqual(mockData);
      expect(db.all).toHaveBeenCalledWith(
        'SELECT final_risk_score, COUNT(*) as count FROM projects GROUP BY final_risk_score'
      );
    });

    it('should return empty array when no projects', async () => {
      db.all.mockResolvedValue([]);

      const result = await dashboardService.getRiskDistribution();

      expect(result).toEqual([]);
    });
  });

  describe('getCostComposition', () => {
    it('should aggregate cost composition from all projects', async () => {
      const mockProjects = [
        {
          assessment_details_json: JSON.stringify({
            softwareDevelopmentCost: 50000,
            systemIntegrationCost: 20000,
            operationsCost: 10000,
            travelCost: 5000,
            riskCost: 3000,
          }),
        },
        {
          assessment_details_json: JSON.stringify({
            softwareDevelopmentCost: 30000,
            systemIntegrationCost: 15000,
            operationsCost: 8000,
            travelCost: 4000,
            riskCost: 2000,
          }),
        },
      ];
      db.all.mockResolvedValue(mockProjects);

      const result = await dashboardService.getCostComposition();

      expect(result).toEqual({
        softwareDevelopment: 80000,
        systemIntegration: 35000,
        operations: 18000,
        travel: 9000,
        risk: 5000,
      });
    });

    it('should handle missing cost fields', async () => {
      const mockProjects = [
        {
          assessment_details_json: JSON.stringify({
            softwareDevelopmentCost: 50000,
            // Missing other fields
          }),
        },
      ];
      db.all.mockResolvedValue(mockProjects);

      const result = await dashboardService.getCostComposition();

      expect(result).toEqual({
        softwareDevelopment: 50000,
        systemIntegration: 0,
        operations: 0,
        travel: 0,
        risk: 0,
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockProjects = [
        { assessment_details_json: 'invalid-json' },
        {
          assessment_details_json: JSON.stringify({
            softwareDevelopmentCost: 10000,
          }),
        },
      ];
      db.all.mockResolvedValue(mockProjects);

      const result = await dashboardService.getCostComposition();

      expect(result.softwareDevelopment).toBe(10000);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should return zero composition when no projects', async () => {
      db.all.mockResolvedValue([]);

      const result = await dashboardService.getCostComposition();

      expect(result).toEqual({
        softwareDevelopment: 0,
        systemIntegration: 0,
        operations: 0,
        travel: 0,
        risk: 0,
      });
    });
  });

  describe('getRoleCostDistribution', () => {
    it('should calculate role costs from workload data', async () => {
      const mockProjects = [
        {
          assessment_details_json: JSON.stringify({
            workload: {
              newFeatures: [
                {
                  module: 'Feature A',
                  roles: {
                    '项目经理': 5,
                    '高级开发': 10,
                  },
                },
              ],
              systemIntegration: [
                {
                  module: 'Integration A',
                  roles: {
                    '高级开发': 8,
                  },
                },
              ],
            },
          }),
        },
      ];

      const mockRoles = [
        { role_name: '项目经理', unit_price: 2000 },
        { role_name: '高级开发', unit_price: 1500 },
      ];

      db.all
        .mockResolvedValueOnce(mockProjects)
        .mockResolvedValueOnce(mockRoles);

      const result = await dashboardService.getRoleCostDistribution();

      expect(result).toEqual({
        '项目经理': 10000, // 5 * 2000
        '高级开发': 27000, // (10 + 8) * 1500
      });
    });

    it('should handle projects without workload data', async () => {
      const mockProjects = [
        { assessment_details_json: JSON.stringify({}) },
      ];
      const mockRoles = [
        { role_name: '项目经理', unit_price: 2000 },
      ];

      db.all
        .mockResolvedValueOnce(mockProjects)
        .mockResolvedValueOnce(mockRoles);

      const result = await dashboardService.getRoleCostDistribution();

      expect(result).toEqual({});
    });

    it('should handle missing role prices', async () => {
      const mockProjects = [
        {
          assessment_details_json: JSON.stringify({
            workload: {
              newFeatures: [
                {
                  roles: {
                    'UnknownRole': 5,
                  },
                },
              ],
            },
          }),
        },
      ];
      const mockRoles = [];

      db.all
        .mockResolvedValueOnce(mockProjects)
        .mockResolvedValueOnce(mockRoles);

      const result = await dashboardService.getRoleCostDistribution();

      expect(result).toEqual({
        'UnknownRole': 0, // 5 * 0 (no price found)
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockProjects = [
        { assessment_details_json: 'invalid-json' },
      ];
      const mockRoles = [
        { role_name: '项目经理', unit_price: 2000 },
      ];

      db.all
        .mockResolvedValueOnce(mockProjects)
        .mockResolvedValueOnce(mockRoles);

      const result = await dashboardService.getRoleCostDistribution();

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getCostTrend', () => {
    it('should return cost trend grouped by month', async () => {
      const mockData = [
        { month: '2024-01', totalCost: 100000 },
        { month: '2024-02', totalCost: 150000 },
        { month: '2024-03', totalCost: 120000 },
      ];
      db.all.mockResolvedValue(mockData);

      const result = await dashboardService.getCostTrend();

      expect(result).toEqual(mockData);
      expect(db.all).toHaveBeenCalledWith(
        "SELECT STRFTIME('%Y-%m', created_at) as month, SUM(final_total_cost) as totalCost FROM projects GROUP BY month ORDER BY month"
      );
    });

    it('should return empty array when no projects', async () => {
      db.all.mockResolvedValue([]);

      const result = await dashboardService.getCostTrend();

      expect(result).toEqual([]);
    });
  });

  describe('getRiskCostCorrelation', () => {
    it('should return risk-cost correlation data', async () => {
      const mockData = [
        { final_risk_score: 10, final_total_cost: 50000 },
        { final_risk_score: 25, final_total_cost: 75000 },
        { final_risk_score: 45, final_total_cost: 120000 },
      ];
      db.all.mockResolvedValue(mockData);

      const result = await dashboardService.getRiskCostCorrelation();

      expect(result).toEqual(mockData);
      expect(db.all).toHaveBeenCalledWith(
        'SELECT final_risk_score, final_total_cost FROM projects WHERE final_risk_score IS NOT NULL AND final_total_cost IS NOT NULL'
      );
    });

    it('should return empty array when no valid data', async () => {
      db.all.mockResolvedValue([]);

      const result = await dashboardService.getRiskCostCorrelation();

      expect(result).toEqual([]);
    });
  });
});
