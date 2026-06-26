# API 契约维护指南

本项目的 API 文档是**从代码派生的机器可读契约**，面向 agent 消费方：契约即工具调用规范，无需阅读后端源码。文档不再手工编写，也不再使用散落的 swagger 注解。

## 单一事实来源

```
zod schema (schemas/*.schema.js)
        │  描述实体与请求/响应形状
        ▼
registerRoute (openapi/paths/*.js)
        │  为每个端点登记 method/path/request/response
        ▼
buildSpec (openapi/generate.js)
        │  汇总为 OpenAPI 3.0 文档
        ├──► GET /api-docs.json   运行时契约（agent 工具规范）
        ├──► GET /api-docs        Swagger UI（人类阅读）
        └──► docs/api/openapi.json + docs/api-inventory.md（构建产物）
```

同一份 zod schema 还驱动 `middleware/validate.js` 的运行时请求校验，因此“文档里的请求形状”与“运行时强制的请求形状”同源，不会漂移。

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `server/schemas/entities.schema.js` | 数据库表 1:1 映射的实体 zod schema |
| `server/schemas/common.schema.js` | 响应信封助手：`apiResponse`/`dataResponse`、`IdParam` 等 |
| `server/openapi/registry.js` | 全局 `OpenAPIRegistry` 单例与 `registerRoute` 助手 |
| `server/openapi/paths/*.js` | 每个路由模块一个文件，登记该模块所有端点 |
| `server/openapi/paths/index.js` | barrel，require 所有 paths 文件以触发登记 |
| `server/openapi/generate.js` | `buildSpec()`：生成 OpenAPI 文档 |
| `server/openapi/docs.js` | 运行时挂载 `/api-docs.json` 与 `/api-docs` |
| `server/scripts/build-openapi.js` | `npm run build:api`：写出文档产物 |
| `server/scripts/list-routes.js` | 枚举 Express 实际注册的路由 |
| `server/tests/api-contract.test.js` | 守门测试：路由 ↔ 契约 双向覆盖 |

## 响应信封

代码库存在两种信封，登记契约时务必与控制器实际返回匹配：

- `apiResponse(schema)` → `{ success: true, data: T }`（较新端点）
- `dataResponse(schema)` → `{ data: T }`（遗留：calculation、dashboard、部分 config 读取）
- form-design 模块使用独立的 `{ code, data, message? }` 信封

## 新增 / 修改端点的流程

1. 若涉及新数据结构，在 `entities.schema.js` 增补 zod schema。
2. 在对应 `openapi/paths/<module>.js` 中用 `registerRoute({...})` 登记端点。
3. 运行 `npm test`——守门测试会校验每个已注册路由都有契约、每条契约都有对应路由。
4. 运行 `npm run build:api` 重新生成 `docs/api/openapi.json` 与 `docs/api-inventory.md`。

## 守门测试

`tests/api-contract.test.js` 通过 `list-routes.js` 枚举真实路由，与 `buildSpec().paths` 比对，**双向**断言：

- 每个已注册路由都必须有 OpenAPI 契约条目（否则测试列出缺失路由）。
- 每条契约条目都必须对应一个真实路由（否则测试列出多余条目）。

因此契约无法在不让测试变红的情况下偏离真实路由。

## 常用命令

```bash
cd server
npm run routes      # 打印所有实际注册的路由及总数
npm run build:api   # 生成 docs/api/openapi.json 与 docs/api-inventory.md
npm test            # 运行全部测试（含守门测试）
```
