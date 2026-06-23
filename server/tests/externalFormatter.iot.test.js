const externalFormatter = require('../services/export/formatters/externalFormatter');

describe('externalFormatter IoT edge cases', () => {
  it('does not append generated IoT workload when role_costs already include IoT', () => {
    const project = {
      id: 1,
      name: 'IoT Export',
      description: '',
      final_total_cost: 0.1,
      final_workload_days: 1,
      assessment_details_json: JSON.stringify({
        roles: [{ role_name: '实施工程师', unit_price: 1000 }],
        role_costs: [
          {
            module1: 'IoT点位对接',
            module2: '点位映射',
            module3: '手动规模评估',
            role: '实施工程师',
            workload_days: 1,
            subtotal: 1000,
          },
        ],
        iot_point_integration: {
          applied_at: '2026-05-07T00:00:00.000Z',
          generated_items: [
            {
              key: 'point_mapping',
              package_name: '点位映射',
              adjusted_days: 1,
              role_name: '实施工程师',
            },
          ],
        },
      }),
    };

    const result = externalFormatter.formatForExport(project);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].module1).toBe('IoT点位对接');
    expect(result.modules[0].workloadDays).toBe(1);
    expect(result.modules[0].costWan).toBeCloseTo(0.1, 5);
  });
});
