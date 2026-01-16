process.env.NODE_ENV = 'test';

const os = require('os');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const request = require('supertest');

const { app } = require('../index');

describe('Contracts API - Integration Tests', () => {
  const previousContractsDir = process.env.CONTRACTS_DIR;
  const tmpBase = path.join(os.tmpdir(), `ppa.contracts.${process.pid}.${Date.now()}`);

  beforeAll(async () => {
    await fsp.mkdir(tmpBase, { recursive: true });
    process.env.CONTRACTS_DIR = tmpBase;

    await fsp.writeFile(path.join(tmpBase, 'readme.txt'), 'not csv', 'utf8');

    const smallCsv = [
      'title line,,,,',
      '',
      '序号,客户,合同名称',
      '1,foo,Alpha',
      '2,bar,Beta',
      '3,foo,Gamma',
    ].join('\n');
    await fsp.writeFile(path.join(tmpBase, 'small.csv'), smallCsv, 'utf8');

    const lines = ['序号,客户,合同名称'];
    for (let i = 1; i <= 5105; i += 1) {
      lines.push(`${i},customer_${i},name_${i}`);
    }
    await fsp.writeFile(path.join(tmpBase, 'large.csv'), lines.join('\n'), 'utf8');

    const multilineCsv =
      '序号,客户,合同名称,备注\n' +
      '1,foo,"Alpha\nBeta","desc,with,comma"\n' +
      '2,bar,Gamma,"ok"\n';
    await fsp.writeFile(path.join(tmpBase, 'multiline.csv'), multilineCsv, 'utf8');
  });

  afterAll(async () => {
    process.env.CONTRACTS_DIR = previousContractsDir;
    try {
      if (fs.existsSync(tmpBase)) {
        fs.rmSync(tmpBase, { recursive: true, force: true });
      }
    } catch (_e) {}
  });

  test('GET /api/contracts/files should list csv files only', async () => {
    const res = await request(app).get('/api/contracts/files');
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);

    const files = res.body?.data?.files;
    expect(Array.isArray(files)).toBe(true);

    const names = files.map((x) => x.name);
    expect(names).toContain('small.csv');
    expect(names).toContain('large.csv');
    expect(names).not.toContain('readme.txt');
  });

  test('GET /api/contracts/file should parse header and return rows', async () => {
    const res = await request(app)
      .get('/api/contracts/file')
      .query({ name: 'small.csv' });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);

    const data = res.body?.data;
    expect(Array.isArray(data?.columns)).toBe(true);
    expect(data.columns.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(data?.rows)).toBe(true);
    expect(data.rows.length).toBe(3);

    expect(data.rows[0]['客户']).toBe('foo');
  });

  test('GET /api/contracts/file should prioritize search hits', async () => {
    const res = await request(app)
      .get('/api/contracts/file')
      .query({ name: 'small.csv', search: 'foo' });

    expect(res.status).toBe(200);
    const rows = res.body?.data?.rows || [];
    expect(rows.length).toBe(3);

    expect(rows[0]['客户']).toBe('foo');
    expect(rows[1]['客户']).toBe('foo');
    expect(rows[2]['客户']).toBe('bar');
  });

  test('GET /api/contracts/file should truncate to 5000 rows by default', async () => {
    const res = await request(app)
      .get('/api/contracts/file')
      .query({ name: 'large.csv' });

    expect(res.status).toBe(200);
    const data = res.body?.data;
    expect(data?.meta?.returned_rows).toBe(5000);
    expect(data?.meta?.truncated).toBe(true);
  });

  test('GET /api/contracts/file should support quoted newlines and commas without column shift', async () => {
    const res = await request(app)
      .get('/api/contracts/file')
      .query({ name: 'multiline.csv' });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    const data = res.body?.data;

    expect(Array.isArray(data?.columns)).toBe(true);
    expect(data?.columns).toEqual(expect.arrayContaining(['合同名称', '备注']));

    const rows = data?.rows || [];
    expect(rows.length).toBe(2);

    expect(rows[0]['客户']).toBe('foo');
    expect(rows[0]['合同名称']).toBe('Alpha\nBeta');
    expect(rows[0]['备注']).toBe('desc,with,comma');
    expect(data?.meta?.delimiter).toBe(',');
  });

  test('GET /api/contracts/file should block path traversal', async () => {
    const res = await request(app)
      .get('/api/contracts/file')
      .query({ name: '../small.csv' });

    expect(res.status).toBe(400);
    expect(res.body?.success).toBe(false);
  });

  test('POST /api/contracts/recommend should rank by tag hit count and return explanation', async () => {
    const res = await request(app)
      .post('/api/contracts/recommend')
      .send({ tags: ['foo', 'Alpha', 'Gamma'], topN: 10, maxRowsPerFile: 5000 });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);

    const items = res.body?.data?.items || [];
    expect(items.length).toBeGreaterThanOrEqual(2);

    // 第一条应该命中 foo + Alpha（2分）
    expect(items[0].score).toBeGreaterThanOrEqual(items[1].score);
    expect(items[0].matched_tags).toEqual(expect.arrayContaining(['foo']));
    expect(items[0].matched_fields).toBeTruthy();
    expect(items[0].row).toBeTruthy();

    // 至少应包含一条来自 small.csv 的推荐
    const files = items.map((x) => x.file);
    expect(files).toContain('small.csv');
  });
});
