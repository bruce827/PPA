
const request = require('supertest');
const { app } = require('../index'); // 只导入 app
const db = require('../config/db');

let server;

describe('Prompt Template API', () => {
  beforeAll((done) => {
    server = app.listen(3002, done); // 在不同端口启动测试服务器
  });

  afterAll((done) => {
    server.close(done);
    db.close();
  });

  // 在每次测试前清理并填充数据
  beforeEach((done) => {
    db.serialize(() => {
      db.run("DELETE FROM prompt_templates", () => {
        db.run(`
          INSERT INTO prompt_templates (id, template_name, category, system_prompt, user_prompt_template, is_system, is_active)
          VALUES
            (1, 'System Template', 'risk_analysis', 'sys', 'user', 1, 1),
            (2, 'User Template', 'custom', 'sys', 'user', 0, 1);
        `, done);
      });
    });
  });

  // Test AC #2: Create
  it('should create a new prompt template', async () => {
    const res = await request(app)
      .post('/api/config/prompts')
      .send({
        template_name: 'New Template',
        category: 'custom',
        system_prompt: 'system',
        user_prompt_template: 'user'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.template_name).toBe('New Template');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/config/prompts')
      .send({ template_name: 'Incomplete' });
    expect(res.statusCode).toEqual(400);
  });

  // Test AC #3: Get All
  it('should get all prompt templates', async () => {
    const res = await request(app).get('/api/config/prompts');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(2);
  });

  // Test AC #4: Get By ID
  it('should get a single prompt template by ID', async () => {
    const res = await request(app).get('/api/config/prompts/2');
    expect(res.statusCode).toEqual(200);
    expect(res.body.template_name).toEqual('User Template');
  });

  it('should return 404 if prompt template not found', async () => {
    const res = await request(app).get('/api/config/prompts/999');
    expect(res.statusCode).toEqual(404);
  });

  // Test AC #5: Update
  it('should update an existing prompt template', async () => {
    const res = await request(app)
      .put('/api/config/prompts/2')
      .send({ template_name: 'Updated Name', category: 'custom', system_prompt: 's', user_prompt_template: 'u', is_active: true });
    expect(res.statusCode).toEqual(200);
    expect(res.body.template_name).toEqual('Updated Name');
  });

  it('should return 403 if trying to update a system template', async () => {
    const res = await request(app)
      .put('/api/config/prompts/1')
      .send({ template_name: 'New System Name' });
    expect(res.statusCode).toEqual(403);
  });

  // Test AC #6: Delete
  it('should delete an existing prompt template', async () => {
    const res = await request(app).delete('/api/config/prompts/2');
    expect(res.statusCode).toEqual(200);
    const check = await request(app).get('/api/config/prompts/2');
    expect(check.statusCode).toEqual(404);
  });

  it('should return 403 if trying to delete a system template', async () => {
    const res = await request(app).delete('/api/config/prompts/1');
    expect(res.statusCode).toEqual(403);
  });
});
