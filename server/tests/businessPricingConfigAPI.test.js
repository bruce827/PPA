process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');

describe('Business Pricing Config API - Integration Tests', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.business-pricing-config.${process.pid}.${Date.now()}.db`
  );

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    await db.init(TEST_DB_PATH);
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_error) {}
  });

  test('should get default business pricing config', async () => {
    const res = await request(app).get('/api/config/business-pricing');

    expect(res.status).toBe(200);
    expect(res.body?.data).toEqual({
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
    });
  });

  test('should update business pricing config within allowed ranges', async () => {
    const payload = {
      custom_development: {
        tax_rate: 13,
        management_rate: 15,
        sales_rate: 10,
        profit_rate: 20,
      },
      enterprise_product: {
        rd_rate: 35,
        cac_rate: 40,
        cogs_rate: 15,
        csm_rate: 10,
      },
    };

    const res = await request(app)
      .put('/api/config/business-pricing')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body?.data).toEqual(payload);
  });

  test('should reject business pricing config outside allowed ranges', async () => {
    const res = await request(app)
      .put('/api/config/business-pricing')
      .send({
        custom_development: {
          tax_rate: 5,
          management_rate: 15,
          sales_rate: 10,
          profit_rate: 20,
        },
        enterprise_product: {
          rd_rate: 40,
          cac_rate: 50,
          cogs_rate: 20,
          csm_rate: 15,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body?.message).toContain('税率必须在 6% 到 13% 之间');
  });

  test('should reject enterprise product pricing config outside allowed ranges', async () => {
    const res = await request(app)
      .put('/api/config/business-pricing')
      .send({
        custom_development: {
          tax_rate: 6,
          management_rate: 12,
          sales_rate: 12,
          profit_rate: 15,
        },
        enterprise_product: {
          rd_rate: 41,
          cac_rate: 40,
          cogs_rate: 15,
          csm_rate: 10,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body?.message).toContain('研发成本（R&D）必须在 30% 到 40% 之间');
  });

  test('should reject enterprise product pricing config when total is not 100%', async () => {
    const res = await request(app)
      .put('/api/config/business-pricing')
      .send({
        custom_development: {
          tax_rate: 6,
          management_rate: 12,
          sales_rate: 12,
          profit_rate: 15,
        },
        enterprise_product: {
          rd_rate: 35,
          cac_rate: 35,
          cogs_rate: 15,
          csm_rate: 10,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body?.message).toContain('企业级产品成本结构合计必须为 100%');
  });
});
