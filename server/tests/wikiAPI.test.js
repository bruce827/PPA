process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
const { initDatabase } = require('../init-db');

describe('Wiki API - Full Integration Test Suite', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.wiki-api.${process.pid}.${Date.now()}.db`
  );

  const wikiDir = path.resolve(__dirname, '../wiki');
  const tempFileRelative = '反盗油专项/储油罐渗漏检测/未注册测试文件.md';
  const tempFilePath = path.join(wikiDir, tempFileRelative);

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // 初始化临时测试数据库，使 relations 读写及 projects 关联不报 SQLITE_ERROR
    await initDatabase(TEST_DB_PATH);
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

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  // ==================== Epic 1: Wiki 浏览与检索 ====================

  test('GET /api/wiki should return wiki tree sorted by INDEX.md', async () => {
    const res = await request(app)
      .get('/api/wiki')
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('projects');
    expect(res.body).toHaveProperty('currentProject');
    expect(res.body.projects).toContain('反盗油专项');
    expect(res.body.currentProject).toBe('反盗油专项');

    const hasProjectScheme = res.body.data.some(
      item => item.wiki_key === '反盗油专项/反盗油专项系统方案/反盗油专项系统方案.md'
    );
    expect(hasProjectScheme).toBe(true);
  });

  test('Static images hosting should return 200 or 404 for actual files', async () => {
    const res = await request(app)
      .get('/api/wiki/images/反盗油专项/INDEX.md')
      .expect(200);

    expect(res.text).toContain('反盗油知识库 — 维基索引');
  });

  test('Should append unregistered physical md files to the end with inIndex=false', async () => {
    fs.writeFileSync(tempFilePath, '# 临时测试内容', 'utf-8');

    const res = await request(app)
      .get('/api/wiki?refresh=true')
      .expect(200);

    const targetKey = '反盗油专项/储油罐渗漏检测/未注册测试文件.md';
    const foundItem = res.body.data.find(item => item.wiki_key === targetKey);
    
    expect(foundItem).toBeDefined();
    expect(foundItem.title).toBe('未注册测试文件');
    expect(foundItem.inIndex).toBe(false);
  });

  test('GET /api/wiki/content should read and translate valid wiki file content', async () => {
    const testFileRelative = '反盗油专项/储油罐渗漏检测/测试解析正文.md';
    const testFilePath = path.join(wikiDir, testFileRelative);

    const testMarkdown = [
      '# 测试标题',
      '在文档中引用了 [[储油罐渗漏检测]]。',
      '以及一个带别名的超链接：[[储油罐渗漏检测|点击查阅详情]]。',
      '图片链接：![](tank_sensor.png)。',
      'Obsidian图片直嵌：![[tank_sensor.png]]。',
      '绝对图片或以斜杠开头的链接：![](https://example.com/logo.png) 和 ![](/api/wiki/images/other.png)。'
    ].join('\n');

    fs.writeFileSync(testFilePath, testMarkdown, 'utf-8');

    try {
      const res = await request(app)
        .get(`/api/wiki/content?path=${encodeURIComponent(testFileRelative)}&refresh=true`)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.key).toBe(testFileRelative);
      
      const content = res.body.data.content;
      expect(content).toContain('[储油罐渗漏检测](/form-design/wiki?key=反盗油专项/储油罐渗漏检测/储油罐渗漏检测)');
      expect(content).toContain('[点击查阅详情](/form-design/wiki?key=反盗油专项/储油罐渗漏检测/储油罐渗漏检测)');
      expect(content).toContain('![]( /api/wiki/images/反盗油专项/储油罐渗漏检测/tank_sensor.png )');
      expect(content).toContain('![tank_sensor.png](/api/wiki/images/反盗油专项/储油罐渗漏检测/tank_sensor.png)');
      expect(content).toContain('![](https://example.com/logo.png)');
      expect(content).toContain('![](/api/wiki/images/other.png)');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('GET /api/wiki/content should prevent Path Traversal and return 403', async () => {
    const res = await request(app)
      .get('/api/wiki/content?path=../../package.json')
      .expect(403);

    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.message).not.toContain('Users/maylis');
  });

  test('GET /api/wiki/content should return 404 and WIKI_FILE_NOT_FOUND when file does not exist', async () => {
    const res = await request(app)
      .get('/api/wiki/content?path=反盗油专项/储油罐渗漏检测/不存在的文件.md')
      .expect(404);

    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message || res.body.error).toContain('WIKI_FILE_NOT_FOUND');
  });

  // ==================== Epic 2: Wiki 与项目多对多双向关联 ====================

  test('Relations API should retrieve and save relations and cascade delete correctly', async () => {
    // 1. 在临时测试 DB 中插入两个测试项目
    const proj1 = await db.run('INSERT INTO projects (name, is_template) VALUES (?, ?)', ['测试项目1', 0]);
    const proj2 = await db.run('INSERT INTO projects (name, is_template) VALUES (?, ?)', ['测试项目2', 0]);
    
    const projectId1 = proj1.id;
    const projectId2 = proj2.id;
    const testWikiKey = '反盗油专项/储油罐渗漏检测/储油罐渗漏检测.md';

    // 2. 将此 Wiki Key 覆盖保存关联到这两个项目上
    await request(app)
      .post('/api/wiki/relations')
      .send({
        wiki_key: testWikiKey,
        project_ids: [projectId1, projectId2]
      })
      .expect(200);

    // 3. 获取此 Wiki 绑定的项目 ID 列表并做断言
    const wikiRelRes = await request(app)
      .get(`/api/wiki/relations?wiki_key=${encodeURIComponent(testWikiKey)}`)
      .expect(200);

    expect(wikiRelRes.body.success).toBe(true);
    expect(wikiRelRes.body.data).toContain(projectId1);
    expect(wikiRelRes.body.data).toContain(projectId2);

    // 4. 反向获取项目关联的 Wiki Key 列表
    const projRelRes1 = await request(app)
      .get(`/api/wiki/relations?project_id=${projectId1}`)
      .expect(200);

    expect(projRelRes1.body.success).toBe(true);
    expect(projRelRes1.body.data).toContain(testWikiKey);

    // 5. 验证级联删除：删除项目1后，它对应的 Wiki 关联关系也应该自动删除
    await db.run('DELETE FROM projects WHERE id = ?', [projectId1]);

    const wikiRelResAfterDelete = await request(app)
      .get(`/api/wiki/relations?wiki_key=${encodeURIComponent(testWikiKey)}`)
      .expect(200);

    expect(wikiRelResAfterDelete.body.data).not.toContain(projectId1);
    expect(wikiRelResAfterDelete.body.data).toContain(projectId2);
  });
});
