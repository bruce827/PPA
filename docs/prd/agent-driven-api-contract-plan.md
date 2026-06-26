# Agent 驱动的 API 契约方案

> 创建时间: 2026-06-25
> 状态: 待实施
> 适用范围: `server/` 后端全部 HTTP 接口

## 1. 背景与目标

### 1.1 问题
- 历史上用 Markdown 手工维护接口文档，文档与代码分离，**接口频繁缺失、字段漂移**。
- 已集成 swagger-jsdoc（注释驱动），但注释与真实代码无强制关系，覆盖率近乎为零，病根未除。
- 现有路由**无参数化校验、SQL 字符串拼接**，存在注入风险（见 CLAUDE.md 已知限制）。

### 1.2 消费方变化（关键）
本系统的 API **消费方是 agent，不是人**：
- 不需要图形化调试台（不依赖 Apifox/Postman 的 GUI）。
- 需要一份**机器可读、永远与代码一致、可被 agent 直接加载**的接口契约。
- agent 据此契约自主调用接口，无需阅读后端源码。

### 1.3 目标
1. **单一真相来源**：接口契约由代码自动派生，不存在第二处手工维护。
2. **不可漂移**：请求校验逻辑与文档由同一份 zod schema 生成，物理上无法不一致。
3. **不可缺失**：CI 守门测试强制「实际注册的路由」与「契约 paths」一致，缺一即失败。
4. **agent 友好**：输出标准 OpenAPI 3 JSON + 生成式 Markdown 清单，agent 可离线读取。
5. **生产可演进**：契约层对鉴权、版本、多环境天然兼容（见第 7 节）。

## 1.4 已确认决策（评审定稿）

| 决策点                 | 选定方案                      | 理由                                                                                     |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| 路由+契约书写方式           | **风格 A：两处分写 + 守门测试**      | `registry.registerPath(...)` 与 `router.xxx(...)` 各写各的，靠守门测试抓漏写。改造改动小、代码所见即所得；不引入自维护抽象。 |
| response schema 精确度 | **request/response 一步到位** | 每个迁移的接口 request 与 response 均精确定义。消费方是 agent，需精确 response 才能正确解析返回结构，不留粗粒度过渡。           |

> 风格 A 的代价是「同一接口信息散两处、可能漏写契约」，由第 7 节守门测试兜底：漏登记即 `npm test` 失败。

## 2. 核心理念

> 代码是唯一真相，契约从代码派生，agent 消费契约。

```
zod schema（一处定义）
   ├──> 运行时校验中间件（挡住非法请求 / 防注入）
   └──> OpenAPI registry ──> 生成 openapi.json ──┬──> /api-docs.json（在线，给运行中 agent）
                                                  ├──> docs/api/openapi.json（落盘产物，给离线 agent / 版本对比）
                                                  └──> docs/api-inventory.md（生成式清单，人类速览）
                                                          ↑
                            路由覆盖率守门测试（CI 强制 一致）
```

不再使用：swagger-jsdoc、手写 `@swagger` 注释、手工维护的接口清单。

## 3. 技术选型

| 用途                | 选型                                            | 说明                                                           |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Schema 定义 + 运行时校验 | `zod@^4`（实测 4.4.3）                            | request/response 同一份定义                                       |
| Schema → OpenAPI  | `@asteasolutions/zod-to-openapi@^8`（实测 8.5.0） | 对 Express（非框架绑定）最友好，registry 收集模式。peerDependency 要求 `zod ^4` |
| 在线契约渲染（可选保留）      | `swagger-ui-express`                          | 仅作只读查看入口，非必需                                                 |
| 守门测试              | `jest` + `supertest`（已有）                      | 路由覆盖率 diff                                                   |
| 移除                | `swagger-jsdoc`                               | 注释驱动，被取代                                                     |

> 说明：保留 `swagger-ui-express` 仅为偶尔人工查看；agent 消费走 JSON 产物，不依赖 UI。若确认完全不需要人看，可一并移除。
>
> **版本事实（已实测确认）**：依赖已装入 `server/`，`package.json` 已登记 `zod@^4.4.3` 与
> `@asteasolutions/zod-to-openapi@^8.5.0`，并已移除 `swagger-jsdoc`。
> **zod v4 必须先调用 `extendZodWithOpenApi(z)`** 才能使用 `.openapi()` 与 registry——
> 这是 v4 与旧版（v3 内置扩展）的关键差异，registry.js 中需在最顶部执行一次。

## 4. 目录结构（新增/调整）

```
server/
├── schemas/                      # 新增：按模块拆分的 zod schema
│   ├── common.schema.js          # ApiResponse / ErrorResponse / 分页 等通用
│   ├── project.schema.js
│   ├── ai.schema.js
│   ├── config.schema.js
│   └── ...（每个路由模块一份）
├── openapi/                      # 新增：契约生成
│   ├── registry.js               # 全局 OpenAPIRegistry 单例
│   └── generate.js               # registry → OpenAPI document
├── middleware/
│   └── validate.js               # 新增：通用校验中间件
├── scripts/
│   ├── build-openapi.js          # 新增：生成 docs/api/openapi.json
│   └── list-routes.js            # 新增：遍历 Express 路由栈，列出真实注册路由
└── swagger/
    └── index.js                  # 改造：spec 来源由 swagger-jsdoc 换成 openapi/generate

docs/
├── api/openapi.json              # 落盘契约产物（提交进 git，供离线 agent / diff）
└── api-inventory.md              # 由脚本生成，不再手工维护
```

## 5. 待清理的旧文件

| 文件 | 处理 |
|---|---|
| `server/routes/projects-swagger.js` | 删除（示例文件，从未接入） |
| `server/routes/ai-swagger.js` | 删除（示例文件） |
| `server/swagger/examples/config-swagger.js` | 删除 |
| `server/swagger/README.md` | 删除或归档 |
| `server/scripts/generate-swagger.js` | 删除（被 build-openapi.js 取代） |
| `server/scripts/generate-api-docs.js` | 删除 |
| `server/routes/health.js` 内的 `@swagger` 注释 | 删注释，接口保留 |
| `docs/API-DOCUMENTATION-GUIDE.md` | 重写为本方案的维护指南 |
| `package.json` 中 `swagger-jsdoc` | 卸载 |

## 6. 核心实现

### 6.1 registry 单例 — `openapi/registry.js`
```js
// zod v4：必须先扩展，整个进程只需执行一次（在最早被 require 的地方）
const { z } = require('zod');
const { OpenAPIRegistry, extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
module.exports = { registry };
```
> `extendZodWithOpenApi(z)` 是全局副作用，对同一个 zod 实例只需调一次；
> 所有 schema 文件 require 的必须是同一个 zod 模块实例，否则 `.openapi()` 不生效。

### 6.2 校验中间件 — `middleware/validate.js`
同时承担「防注入 / 挡非法请求」与「契约登记的数据源」两个角色。
```js
// 用 zod schema 校验 body/query/params，失败统一返回 400
function validate({ body, query, params }) {
  return (req, res, next) => {
    try {
      if (body)   req.body   = body.parse(req.body);
      if (query)  req.query  = query.parse(req.query);
      if (params) req.params = params.parse(req.params);
      next();
    } catch (err) {
      res.status(400).json({ success: false, error: err.errors ?? String(err) });
    }
  };
}
module.exports = { validate };
```

### 6.3 schema 定义 — `schemas/project.schema.js`（一处定义，校验+文档共用）
```js
const { z } = require('zod');
const { registry } = require('../openapi/registry');

const ProjectSchema = registry.register('Project', z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().optional(),
  is_template: z.boolean(),
  created_at: z.string(),
}));

const CreateProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空'),
  description: z.string().optional(),
  assessment_details_json: z.record(z.any()).optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().default(1),
  pageSize: z.coerce.number().int().default(10),
  keyword: z.string().optional(),
});

module.exports = { ProjectSchema, CreateProjectSchema, ListQuerySchema };
```

### 6.4 路由处登记 — `routes/projects.js`（校验与文档同源）
```js
const { validate } = require('../middleware/validate');
const { registry } = require('../openapi/registry');
const { CreateProjectSchema, ListQuerySchema, ProjectSchema } = require('../schemas/project.schema');

// —— 契约登记（取代 @swagger 注释）——
registry.registerPath({
  method: 'post', path: '/api/projects', tags: ['项目管理'], summary: '创建项目',
  request: { body: { content: { 'application/json': { schema: CreateProjectSchema } } } },
  responses: { 200: { description: '创建成功',
    content: { 'application/json': { schema: ProjectSchema } } } },
});

// —— 实际路由：同一份 schema 做运行时校验 ——
router.post('/', validate({ body: CreateProjectSchema }), projectController.createProject);
```

### 6.5 生成契约 — `openapi/generate.js`
```js
const { OpenApiGeneratorV3 } = require('@asteasolutions/zod-to-openapi');
const { registry } = require('./registry');
require('../routes'); // 触发所有 registerPath 执行

function buildSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: { title: 'PPA 项目评估系统 API', version: '1.0.0' },
    servers: [{ url: process.env.API_BASE_URL || 'http://localhost:3001' }],
  });
}
module.exports = { buildSpec };
```

### 6.6 落盘脚本 — `scripts/build-openapi.js`
```js
const fs = require('fs');
const path = require('path');
const { buildSpec } = require('../openapi/generate');
const out = path.join(__dirname, '../../docs/api/openapi.json');
fs.writeFileSync(out, JSON.stringify(buildSpec(), null, 2));
console.log('✅ 契约已生成:', out);
```
> 配合 `package.json` 脚本：`"build:api": "node scripts/build-openapi.js"`，
> 并在 pre-commit / CI 中运行，保证落盘契约始终跟随代码。

## 7. 守门测试（不可缺失的机制保证）

`tests/api-contract.test.js`：
1. 遍历 Express 实际注册的路由栈，得到「真实路由集合」。
2. 读取 `buildSpec().paths`，得到「契约路由集合」。
3. 两集合 diff，**有任何接口未登记契约 → 测试失败**，并打印缺失清单。

这是「接口永不缺失」从靠自觉变为靠机制的关键一环。`npm test` 已接入 jest，新增此测试即纳入现有流程。

## 8. agent 如何消费契约

| 场景 | 入口 | 说明 |
|---|---|---|
| 运行中 agent | `GET /api-docs.json` | 实时契约，随服务启动 |
| 离线 / 构建期 agent | `docs/api/openapi.json` | 提交进 git，可版本对比、可 diff PR |
| 人类速览 | `docs/api-inventory.md` | 脚本生成，非手工 |

OpenAPI 3 是 agent 工具调用的事实标准格式，可直接转成 function-calling 的 tool schema，无需中间适配。

## 9. 实施步骤（渐进，不阻塞开发）

1. 装依赖（`zod`、`@asteasolutions/zod-to-openapi`），卸 `swagger-jsdoc`；搭 registry / validate / generate 三个基础件。
2. 清理第 5 节列出的旧文件。
3. 先迁 **一个模块**（建议 `projects`）跑通：校验生效 + 契约生成 + `/api-docs.json` 正确。
4. 加守门测试，它会列出其余未登记接口，照清单逐个迁移。
5. 接 `build:api` 到 pre-commit / CI；生成 `docs/api/openapi.json` 与 `docs/api-inventory.md`。
6. 全量迁移完成后，移除 swagger-ui-express（若确认无人工查看需求）。

## 10. 生产环境适配性评估

本方案对未来上生产**天然兼容**，按维度说明：

- **鉴权**：现为单用户无鉴权。生产加 JWT/Session 时，zod-to-openapi 的 registry 支持
  `registerComponent('securitySchemes', ...)` 与 path 级 `security` 字段，契约可如实反映鉴权要求，
  agent 据此携带 token。校验中间件链上再加鉴权中间件即可，互不冲突。
- **多环境**：`servers` 由 `API_BASE_URL` 环境变量驱动，dev/staging/prod 自动切换；
  落盘契约可按环境生成多份或用变量占位。
- **版本管理**：契约 `info.version` 跟随发布；若引入 `/api/v2`，registerPath 的 path 前缀即版本，
  天然支持多版本并存。`docs/api/openapi.json` 进 git 后，每次 PR 可 diff 出接口变更，作为破坏性变更审查依据。
- **安全/敏感字段**：response schema 显式定义字段，可避免把 `api_key` 等敏感字段写进契约
  （现 swagger 的 AIModel schema 暴露了 api_key，迁移时应剔除）。
- **生产关闭只读 UI**：`/api-docs` 可由 `SWAGGER_ENABLED` 环境变量在生产关闭，
  契约 JSON 产物仍随构建产出，不影响 agent 消费。
- **性能**：契约在启动时构建一次并缓存；校验是 O(字段数) 的同步操作，开销可忽略。

**结论**：方案不仅满足当前 agent 驱动的开发期需求，上生产后在鉴权、版本、多环境、安全四个维度均可平滑扩展，无需推翻重构。唯一需要补做的是生产期的鉴权 schema 登记与敏感字段审查，属于增量工作。

## 11. 风险与注意事项

- **迁移期双轨**：未迁移的旧路由暂无校验，守门测试会把它们标为「缺契约」，需容忍一段过渡期或用白名单临时豁免。
- **response schema 工作量**：已定「request/response 一步到位」（见 1.4），即每个迁移的接口
  request 与 response 都精确定义。这比只做 request 工作量大，但消费方是 agent，精确 response 是必需的。
  应对方式是**按模块迁移、迁一个精一个**，而非全量铺粗粒度——用迁移节奏控制工作量，不牺牲精确度。
- **zod 与 Express 5**：Express 5 的 `req.query` 在某些版本为只读，校验中间件回写 `req.query` 时需用 `Object.defineProperty` 或改用 `res.locals` 承载校验结果，实施时需验证。

