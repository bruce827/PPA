const { z } = require('zod');
const { registerRoute } = require('../registry');
const { IdParam } = require('../../schemas/common.schema');
const {
  FormProject,
  FormApp,
  FormDefinition,
  FormField,
} = require('../../schemas/entities.schema');

const TAGS = ['FormDesign'];

// form-design controllers use a distinct `{ code, data, message? }` envelope
// (HTTP-status mirrored into the body), unlike the rest of the API.
const codeData = (schema) =>
  z.object({
    code: z.number().int(),
    data: schema,
    message: z.string().optional(),
  });
const codeMsg = z.object({ code: z.number().int(), message: z.string() });

// ===== 统计 / 校验 =========================================================
registerRoute({
  method: 'get',
  path: '/api/form-design/stats',
  tags: TAGS,
  summary: '获取表单设计统计',
  response: codeData(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/form-design/validate/field',
  tags: TAGS,
  summary: '校验单个字段定义',
  body: z.object({}).passthrough(),
  response: codeData(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/form-design/validate/form/{formId}',
  tags: TAGS,
  summary: '校验整张表单',
  params: z.object({ formId: z.coerce.number().int() }),
  response: codeData(z.any()),
});

// ===== 设计项目 CRUD =======================================================
registerRoute({
  method: 'get',
  path: '/api/form-design/projects',
  tags: TAGS,
  summary: '获取设计项目列表',
  response: codeData(z.array(FormProject)),
});
registerRoute({
  method: 'get',
  path: '/api/form-design/projects/{id}',
  tags: TAGS,
  summary: '获取单个设计项目',
  params: IdParam,
  response: codeData(FormProject),
});
registerRoute({
  method: 'post',
  path: '/api/form-design/projects',
  tags: TAGS,
  summary: '创建设计项目',
  body: FormProject.partial().required({ project_name: true }),
  response: codeData(FormProject),
});
registerRoute({
  method: 'put',
  path: '/api/form-design/projects/{id}',
  tags: TAGS,
  summary: '更新设计项目',
  params: IdParam,
  body: FormProject.partial(),
  response: codeData(FormProject),
});
registerRoute({
  method: 'delete',
  path: '/api/form-design/projects/{id}',
  tags: TAGS,
  summary: '删除设计项目',
  params: IdParam,
  response: codeMsg,
});

// ===== 应用 CRUD ===========================================================
registerRoute({
  method: 'get',
  path: '/api/form-design/projects/{projectId}/apps',
  tags: TAGS,
  summary: '获取项目下的应用列表',
  params: z.object({ projectId: z.coerce.number().int() }),
  response: codeData(z.array(FormApp)),
});
registerRoute({
  method: 'post',
  path: '/api/form-design/apps',
  tags: TAGS,
  summary: '创建应用',
  body: FormApp.partial(),
  response: codeData(FormApp),
});
registerRoute({
  method: 'put',
  path: '/api/form-design/apps/{id}',
  tags: TAGS,
  summary: '更新应用',
  params: IdParam,
  body: FormApp.partial(),
  response: codeData(FormApp),
});
registerRoute({
  method: 'delete',
  path: '/api/form-design/apps/{id}',
  tags: TAGS,
  summary: '删除应用',
  params: IdParam,
  response: codeMsg,
});

// ===== 表单 CRUD ===========================================================
registerRoute({
  method: 'get',
  path: '/api/form-design/apps/{appId}/forms',
  tags: TAGS,
  summary: '获取应用下的表单列表',
  params: z.object({ appId: z.coerce.number().int() }),
  response: codeData(z.array(FormDefinition)),
});
registerRoute({
  method: 'post',
  path: '/api/form-design/forms',
  tags: TAGS,
  summary: '创建表单',
  body: FormDefinition.partial(),
  response: codeData(FormDefinition),
});
registerRoute({
  method: 'put',
  path: '/api/form-design/forms/{id}',
  tags: TAGS,
  summary: '更新表单',
  params: IdParam,
  body: FormDefinition.partial(),
  response: codeData(FormDefinition),
});
registerRoute({
  method: 'delete',
  path: '/api/form-design/forms/{id}',
  tags: TAGS,
  summary: '删除表单',
  params: IdParam,
  response: codeMsg,
});

// ===== 字段 CRUD ===========================================================
registerRoute({
  method: 'get',
  path: '/api/form-design/forms/{formId}/fields',
  tags: TAGS,
  summary: '获取表单下的字段列表',
  params: z.object({ formId: z.coerce.number().int() }),
  response: codeData(z.array(FormField)),
});
registerRoute({
  method: 'post',
  path: '/api/form-design/fields',
  tags: TAGS,
  summary: '创建字段',
  body: FormField.partial(),
  response: codeData(FormField),
});
registerRoute({
  method: 'put',
  path: '/api/form-design/fields/{id}',
  tags: TAGS,
  summary: '更新字段',
  params: IdParam,
  body: FormField.partial(),
  response: codeData(FormField),
});
registerRoute({
  method: 'delete',
  path: '/api/form-design/fields/{id}',
  tags: TAGS,
  summary: '删除字段',
  params: IdParam,
  response: codeMsg,
});
registerRoute({
  method: 'post',
  path: '/api/form-design/fields/batch',
  tags: TAGS,
  summary: '批量更新字段（最多 200 条）',
  body: z.object({ fields: z.array(z.any()) }).passthrough(),
  response: codeMsg,
});
