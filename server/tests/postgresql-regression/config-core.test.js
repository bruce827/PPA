const {
  agent,
  cleanupTracked,
  closePostgresTestDb,
  expectOk,
  extractId,
  initPostgresTestDb,
  track,
  uniquePrefix,
} = require('./helpers');

describe('PostgreSQL regression - config core APIs', () => {
  let prefix;

  beforeAll(async () => {
    await initPostgresTestDb();
    prefix = uniquePrefix('config');
  });

  afterAll(async () => {
    await cleanupTracked();
    await closePostgresTestDb();
  });

  test('health endpoint verifies PostgreSQL connection only', async () => {
    const res = await agent().get('/api/health');
    expectOk(res);
    expect(res.body?.data?.database?.connected).toBe(true);
    expect(String(res.body?.data?.database?.type).toLowerCase()).toBe('postgres');
  });

  test('roles CRUD works in PostgreSQL', async () => {
    const createRes = await agent()
      .post('/api/config/roles')
      .send({ role_name: `${prefix}_role`, unit_price: 1800 });
    expectOk(createRes, [200, 201]);
    const roleId = track('config_roles', extractId(createRes));

    const listRes = await agent().get('/api/config/roles');
    expectOk(listRes);
    expect(listRes.body.data.some((role) => role.id === roleId)).toBe(true);

    const updateRes = await agent()
      .put(`/api/config/roles/${roleId}`)
      .send({ role_name: `${prefix}_role_updated`, unit_price: 2200 });
    expectOk(updateRes);

    const deleteRes = await agent().delete(`/api/config/roles/${roleId}`);
    expectOk(deleteRes);
  });

  test('risk items CRUD validates JSON and persists scores', async () => {
    const createRes = await agent()
      .post('/api/config/risk-items')
      .send({
        category: '交付风险',
        item_name: `${prefix}_risk`,
        options_json: JSON.stringify([
          { label: '低', score: 10 },
          { label: '高', score: 20 },
        ]),
      });
    expectOk(createRes, [200, 201]);
    const riskId = track('config_risk_items', extractId(createRes));

    const invalidRes = await agent()
      .post('/api/config/risk-items')
      .send({ category: '交付风险', item_name: `${prefix}_bad_risk`, options_json: '{bad' });
    expect(invalidRes.status).toBe(400);

    const updateRes = await agent()
      .put(`/api/config/risk-items/${riskId}`)
      .send({
        category: '交付风险',
        item_name: `${prefix}_risk_updated`,
        options_json: JSON.stringify([{ label: '中', score: 15 }]),
      });
    expectOk(updateRes);

    const deleteRes = await agent().delete(`/api/config/risk-items/${riskId}`);
    expectOk(deleteRes);
  });

  test('travel costs CRUD works in PostgreSQL', async () => {
    const createRes = await agent()
      .post('/api/config/travel-costs')
      .send({ item_name: `${prefix}_travel`, cost_per_month: 8000 });
    expectOk(createRes, [200, 201]);
    const travelId = track('config_travel_costs', extractId(createRes));

    expectOk(await agent().get('/api/config/travel-costs'));

    const updateRes = await agent()
      .put(`/api/config/travel-costs/${travelId}`)
      .send({ item_name: `${prefix}_travel_updated`, cost_per_month: 8800 });
    expectOk(updateRes);

    const deleteRes = await agent().delete(`/api/config/travel-costs/${travelId}`);
    expectOk(deleteRes);
  });

  test('business pricing get/update and aggregate config endpoints work', async () => {
    const payload = {
      custom_development: {
        tax_rate: 6,
        management_rate: 12,
        sales_rate: 12,
        profit_rate: 15,
      },
      enterprise_product: {
        rd_rate: 35,
        cac_rate: 40,
        cogs_rate: 15,
        csm_rate: 10,
      },
    };

    expectOk(await agent().get('/api/config/business-pricing'));
    const updateRes = await agent().put('/api/config/business-pricing').send(payload);
    expectOk(updateRes);
    expect(updateRes.body.data).toEqual(payload);

    const invalidRes = await agent().put('/api/config/business-pricing').send({
      ...payload,
      enterprise_product: { rd_rate: 35, cac_rate: 35, cogs_rate: 15, csm_rate: 10 },
    });
    expect(invalidRes.status).toBe(400);

    const aggregateRes = await agent().get('/api/config/all');
    expectOk(aggregateRes);
    expect(aggregateRes.body.data).toEqual(expect.any(Object));
  });
});
