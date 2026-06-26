const fs = require('fs');
const os = require('os');
const path = require('path');

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

describe('PostgreSQL regression - opportunity and auxiliary APIs', () => {
  let prefix;
  let scriptDir;

  beforeAll(async () => {
    scriptDir = path.join(os.tmpdir(), `ppa-pgreg-scripts-${process.pid}-${Date.now()}`);
    process.env.BIDDING_SITE_SCRIPT_DIR = scriptDir;
    fs.rmSync(scriptDir, { recursive: true, force: true });
    await initPostgresTestDb();
    prefix = uniquePrefix('aux');
  });

  afterAll(async () => {
    await cleanupTracked();
    await closePostgresTestDb();
    fs.rmSync(scriptDir, { recursive: true, force: true });
  });

  test('bidding site CRUD and script upload work without external validation', async () => {
    const createRes = await agent()
      .post('/api/opportunity/bidding-sites')
      .send({
        name: `${prefix}_site`,
        alias_name: `${prefix}_alias`,
        url: `https://${prefix}.example.com/portal`,
        source_level: '地方省市',
        platform_type: '政府采购',
        is_official: true,
        enabled: true,
      });
    expectOk(createRes);
    const siteId = track('opportunity_bidding_sites', extractId(createRes));

    expectOk(await agent().get('/api/opportunity/bidding-sites').query({ keyword: prefix }));
    expectOk(await agent().get(`/api/opportunity/bidding-sites/${siteId}`));

    const updateRes = await agent()
      .put(`/api/opportunity/bidding-sites/${siteId}`)
      .send({
        name: `${prefix}_site_updated`,
        url: `https://${prefix}.example.com/portal`,
        source_level: '地方省市',
        platform_type: '公共资源交易',
        is_official: true,
        enabled: true,
      });
    expectOk(updateRes);

    const scriptRes = await agent()
      .post(`/api/opportunity/bidding-sites/${siteId}/script`)
      .set('Content-Type', 'text/plain')
      .set('X-Script-Filename', encodeURIComponent(`${prefix}.py`))
      .send('print("postgres regression")\n');
    expectOk(scriptRes);
    expect(scriptRes.body.data.site.has_script).toBe(true);

    const stagingRes = await agent().get('/api/opportunity/tender-staging');
    expectOk(stagingRes);

    expectOk(await agent().delete(`/api/opportunity/bidding-sites/${siteId}`));
  });

  test('monitoring endpoints return log metadata or a controlled not-found response', async () => {
    expectOk(await agent().get('/api/monitoring/logs'));
    expectOk(await agent().get('/api/monitoring/stats'));

    const detailRes = await agent().get('/api/monitoring/logs/non-existent-request-hash');
    expect([200, 404]).toContain(detailRes.status);
  });

  test('contracts endpoints respond with deterministic API envelopes', async () => {
    const filesRes = await agent().get('/api/contracts/files');
    expectOk(filesRes);
    expect(filesRes.body.data.files).toEqual(expect.any(Array));

    const recommendRes = await agent()
      .post('/api/contracts/recommend')
      .send({ tags: ['软件开发'], topN: 3, maxRowsPerFile: 20 });
    expectOk(recommendRes);
    expect(recommendRes.body.data).toBeDefined();
  });

  test('wiki tree and relations endpoints work in PostgreSQL', async () => {
    const treeRes = await agent().get('/api/wiki');
    expect([200, 404]).toContain(treeRes.status);

    const relationsRes = await agent().get('/api/wiki/relations').query({ wiki_key: `${prefix}_wiki` });
    expectOk(relationsRes);

    const saveRes = await agent()
      .post('/api/wiki/relations')
      .send({
        wiki_key: `${prefix}_wiki`,
        project_ids: [],
      });
    expectOk(saveRes);
  });
});
