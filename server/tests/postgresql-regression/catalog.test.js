const { endpoints } = require('./endpointCatalog');

describe('PostgreSQL regression endpoint catalog', () => {
  test('each endpoint has explicit coverage mode and priority', () => {
    expect(endpoints.length).toBeGreaterThan(80);

    const keys = new Set();
    endpoints.forEach((endpoint) => {
      expect(endpoint.method).toMatch(/^(GET|POST|PUT|DELETE|PATCH)$/);
      expect(endpoint.path).toMatch(/^\/api\//);
      expect(['included', 'skipped']).toContain(endpoint.mode);
      expect(['P0', 'P1', 'P2', 'P3']).toContain(endpoint.priority);
      expect(endpoint.group).toEqual(expect.any(String));

      const key = `${endpoint.method} ${endpoint.path}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);

      if (endpoint.mode === 'skipped') {
        expect(endpoint.reason).toEqual(expect.any(String));
      }
    });
  });

  test('external AI invocation endpoints are explicitly skipped', () => {
    const skipped = endpoints.filter((endpoint) => endpoint.mode === 'skipped');
    expect(skipped.map((endpoint) => `${endpoint.method} ${endpoint.path}`)).toEqual(
      expect.arrayContaining([
        'POST /api/ai/assess-risk',
        'POST /api/ai/analyze-project-modules',
        'POST /api/ai/evaluate-workload',
        'POST /api/config/ai-models/:id/test',
        'POST /api/config/ai-models/test-temp',
        'POST /api/web3d/ai/step4-analyze',
      ])
    );
  });
});
