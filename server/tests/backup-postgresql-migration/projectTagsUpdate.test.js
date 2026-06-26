process.env.NODE_ENV = 'test';

const os = require('os');
const path = require('path');
const fs = require('fs');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');

describe('Projects API - tags update (PUT /api/projects/:id)', () => {
  const TEST_DB_PATH = path.join(os.tmpdir(), `ppa.project.tags.${process.pid}.${Date.now()}.db`);

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);

    await db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_template BOOLEAN NOT NULL DEFAULT 0,
        project_type TEXT DEFAULT 'standard',
        final_total_cost REAL,
        final_risk_score INTEGER,
        final_workload_days REAL,
        assessment_details_json TEXT,
        tags_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.run(
      `INSERT INTO projects (name, description, is_template, project_type, assessment_details_json, tags_json)
       VALUES (?, ?, 0, 'standard', ?, ?)`,
      [
        'test-project',
        'desc',
        JSON.stringify({ foo: 'bar' }),
        JSON.stringify(['old'])
      ]
    );
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_e) {}
  });

  test('should update tags_json and assessment_details_json.tags when only tags provided', async () => {
    const getBefore = await request(app).get('/api/projects/1');
    expect(getBefore.status).toBe(200);

    const beforeProject = getBefore.body?.data;
    expect(beforeProject).toBeTruthy();

    const res = await request(app)
      .put('/api/projects/1')
      .send({ tags: ['  a ', 'b', 'a', '', null, 'c'.repeat(50)] });

    expect(res.status).toBe(200);

    const getAfter = await request(app).get('/api/projects/1');
    expect(getAfter.status).toBe(200);

    const afterProject = getAfter.body?.data;
    expect(afterProject).toBeTruthy();

    expect(afterProject.tags_json).toBeTruthy();
    const tags = JSON.parse(afterProject.tags_json);
    expect(tags).toEqual(['a', 'b', 'cccccccccccccccccccccccccccccc']);

    const details = JSON.parse(afterProject.assessment_details_json);
    expect(details.tags).toEqual(['a', 'b', 'cccccccccccccccccccccccccccccc']);
  });
});
