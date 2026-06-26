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

describe('PostgreSQL regression - Web3D, form design and data metrics APIs', () => {
  let prefix;

  beforeAll(async () => {
    await initPostgresTestDb();
    prefix = uniquePrefix('feature');
  });

  afterAll(async () => {
    await cleanupTracked();
    await closePostgresTestDb();
  });

  test('Web3D config and project flow works in PostgreSQL', async () => {
    const riskRes = await agent()
      .post('/api/web3d/config/risk-items')
      .send({
        step_order: 1,
        step_name: `${prefix}_step`,
        item_name: `${prefix}_risk`,
        description: 'Web3D regression risk',
        weight: 1,
        options_json: [
          { label: 'low', value: 1 },
          { label: 'high', value: 3 },
        ],
      });
    expectOk(riskRes, [200, 201]);
    const riskId = track('web3d_risk_items', extractId(riskRes));

    const workloadRes = await agent()
      .post('/api/web3d/config/workload-templates')
      .send({
        category: 'core_dev',
        item_name: `${prefix}_workload`,
        description: 'Web3D regression workload',
        base_days: 3,
        unit: '项',
      });
    expectOk(workloadRes, [200, 201]);
    const workloadId = track('web3d_workload_templates', extractId(workloadRes));

    expectOk(await agent().get('/api/web3d/config/risk-items'));
    expectOk(await agent().get('/api/web3d/config/workload-templates'));

    const assessment = {
      risk_selections: [{ item_id: riskId, selected_value: 3 }],
      workload_items: [{ category: 'core_dev', item_name: `${prefix}_workload`, quantity: 2 }],
    };
    const calcRes = await agent().post('/api/web3d/projects/calculate').send(assessment);
    expectOk(calcRes);
    expect(calcRes.body.data.cost.total_cost_wan).toEqual(expect.any(Number));

    const projectRes = await agent()
      .post('/api/web3d/projects')
      .send({
        name: `${prefix}_web3d_project`,
        description: 'Web3D PostgreSQL regression',
        is_template: 0,
        assessment,
      });
    expectOk(projectRes, [200, 201]);
    const projectId = track('web3d_projects', extractId(projectRes));

    expectOk(await agent().get('/api/web3d/projects'));
    expectOk(await agent().get(`/api/web3d/projects/${projectId}`));
    expectOk(await agent().post(`/api/web3d/projects/${projectId}/calculate`).send(assessment));

    const exportRes = await agent().get(`/api/web3d/projects/${projectId}/export`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    expectOk(
      await agent()
        .put(`/api/web3d/projects/${projectId}`)
        .send({ name: `${prefix}_web3d_project_updated`, assessment })
    );
    expectOk(await agent().delete(`/api/web3d/projects/${projectId}`));
    expectOk(await agent().delete(`/api/web3d/config/workload-templates/${workloadId}`));
    expectOk(await agent().delete(`/api/web3d/config/risk-items/${riskId}`));
  });

  test('form design project/app/form/field flow works in PostgreSQL', async () => {
    expectOk(await agent().get('/api/form-design/stats'));
    const validationRes = await agent()
      .post('/api/form-design/validate/field')
      .send({
        field_name: '名称',
        field_code: 'name',
        field_type: 'varchar',
        field_length: 100,
        input_type: '文本框',
      });
    expectOk(validationRes);

    const projectRes = await agent()
      .post('/api/form-design/projects')
      .send({ project_name: `${prefix}_form_project`, project_desc: 'Regression form project' });
    expectOk(projectRes);
    const projectId = track('form_project', extractId(projectRes));

    const appRes = await agent()
      .post('/api/form-design/apps')
      .send({
        project_id: projectId,
        app_name: `${prefix}_app`,
        app_code: `${prefix}_app_code`,
        description: 'Regression app',
      });
    expectOk(appRes);
    const appId = track('form_app', extractId(appRes));

    const formRes = await agent()
      .post('/api/form-design/forms')
      .send({
        app_id: appId,
        form_name: `${prefix}_form`,
        form_code: `${prefix}_form_code`,
        description: 'Regression form',
      });
    expectOk(formRes);
    const formId = track('form_definition', extractId(formRes));

    const fieldRes = await agent()
      .post('/api/form-design/fields')
      .send({
        form_id: formId,
        field_name: `${prefix}_field`,
        field_code: `${prefix}_field_code`,
        field_type: 'varchar',
        field_length: 100,
        input_type: '文本框',
        input_type_code: 'text',
        add_control: '读写',
        update_control: '读写',
        detail_control: '只读',
        list_control: '只读',
        placeholder: '请输入',
      });
    expectOk(fieldRes);
    const fieldId = track('form_field', extractId(fieldRes));

    expectOk(await agent().get('/api/form-design/projects'));
    expectOk(await agent().get(`/api/form-design/projects/${projectId}`));
    expectOk(await agent().get(`/api/form-design/projects/${projectId}/apps`));
    expectOk(await agent().get(`/api/form-design/apps/${appId}/forms`));
    expectOk(await agent().get(`/api/form-design/forms/${formId}/fields`));
    expectOk(await agent().get(`/api/form-design/validate/form/${formId}`));

    expectOk(
      await agent()
        .post('/api/form-design/fields/batch')
        .send([
          {
            id: fieldId,
            form_id: formId,
            field_name: `${prefix}_field`,
            field_code: `${prefix}_field_code`,
            field_type: 'varchar',
            field_length: 100,
            input_type: '文本框',
            input_type_code: 'text',
            add_control: '读写',
            update_control: '读写',
            detail_control: '只读',
            list_control: '只读',
            placeholder: '请输入',
            sort_order: 2,
          },
        ])
    );

    expectOk(await agent().delete(`/api/form-design/fields/${fieldId}`));
    expectOk(await agent().delete(`/api/form-design/forms/${formId}`));
    expectOk(await agent().delete(`/api/form-design/apps/${appId}`));
    expectOk(await agent().delete(`/api/form-design/projects/${projectId}`));
  });

  test('data metrics CRUD, category tree, import/export and agent endpoints work', async () => {
    const projectRes = await agent()
      .post('/api/data-metrics/projects')
      .send({ project_name: `${prefix}_metrics_project`, project_desc: 'Regression metrics project' });
    expectOk(projectRes, [201]);
    const projectId = track('data_metrics_project', extractId(projectRes));

    const metricRes = await agent()
      .post('/api/data-metrics')
      .send({
        dm_project_id: projectId,
        application: 'PPA',
        module_name: `${prefix}_module`,
        scene_l1: `${prefix}_scene1`,
        scene_l2: `${prefix}_scene2`,
        metric_name: `${prefix}_metric`,
        display_type: '统计数据',
        data_source_logic: 'count(*)',
        algorithm: 'count',
        collection_cycle: '日',
      });
    expectOk(metricRes, [201]);
    const metricId = track('data_metrics', extractId(metricRes));

    const moduleRes = await agent()
      .post('/api/data-metrics/categories')
      .send({ dm_project_id: projectId, type: 'module', name: `${prefix}_module` });
    expectOk(moduleRes, [201]);
    const moduleId = track('data_metric_categories', extractId(moduleRes));

    const sceneRes = await agent()
      .post('/api/data-metrics/categories')
      .send({
        dm_project_id: projectId,
        type: 'scene_l1',
        name: `${prefix}_scene1`,
        parent_id: moduleId,
      });
    expectOk(sceneRes, [201]);
    const sceneId = track('data_metric_categories', extractId(sceneRes));

    expectOk(await agent().get('/api/data-metrics/projects'));
    expectOk(await agent().get(`/api/data-metrics/projects/${projectId}`));
    expectOk(await agent().get('/api/data-metrics/stats').query({ dm_project_id: projectId }));
    expectOk(await agent().get('/api/data-metrics/filter-options').query({ dm_project_id: projectId }));
    expectOk(await agent().get('/api/data-metrics/linked-projects'));
    expectOk(await agent().get('/api/data-metrics').query({ dm_project_id: projectId }));
    expectOk(await agent().get(`/api/data-metrics/${metricId}`));
    expectOk(await agent().get('/api/data-metrics/categories/tree').query({ dm_project_id: projectId }));

    expectOk(
      await agent()
        .put(`/api/data-metrics/${metricId}`)
        .send({ metric_name: `${prefix}_metric_updated`, display_type: '柱状图' })
    );
    expectOk(
      await agent()
        .post('/api/data-metrics/batch')
        .send({ action: 'update', ids: [metricId], data: { collection_cycle: '月' } })
    );

    const importRes = await agent()
      .post('/api/data-metrics/import')
      .send({
        dm_project_id: projectId,
        mode: 'append',
        data: [
          {
            application: 'PPA',
            module_name: `${prefix}_module_import`,
            scene_l1: `${prefix}_scene1_import`,
            scene_l2: `${prefix}_scene2_import`,
            metric_name: `${prefix}_metric_import`,
            display_type: '表格',
          },
        ],
      });
    expectOk(importRes);

    const exportRes = await agent().get('/api/data-metrics/export').query({ dm_project_id: projectId });
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const agentHeaders = { 'X-Agent-API-Key': process.env.PPA_AGENT_SECRET_KEY || 'ppa_agent_secret_token_2026' };
    expectOk(await agent().get(`/api/data-metrics/projects/${projectId}/agent-context`).set(agentHeaders));
    expectOk(await agent().get(`/api/data-metrics/projects/${projectId}/agent-layout`).set(agentHeaders));
    expectOk(
      await agent()
        .post(`/api/data-metrics/projects/${projectId}/agent-feedback`)
        .set(agentHeaders)
        .send({ layout_json: [{ metric_name: `${prefix}_metric`, grid: { x: 0, y: 0, w: 3, h: 2 } }] })
    );
    expectOk(await agent().get(`/api/data-metrics/projects/${projectId}/export/json`).set(agentHeaders));
    expectOk(
      await agent()
        .post(`/api/data-metrics/projects/${projectId}/convert-to-ppa-template`)
        .set(agentHeaders)
    );

    expectOk(await agent().delete(`/api/data-metrics/${metricId}`));
    expectOk(await agent().delete(`/api/data-metrics/categories/${sceneId}`));
    expectOk(await agent().delete(`/api/data-metrics/categories/${moduleId}`));
    expectOk(await agent().delete(`/api/data-metrics/projects/${projectId}`));
  });
});
