# Server API 测试 Todo

## 参数配置模块

- [x] 用例 2：角色配置 CRUD（tests/server-api-regression.test.md）
- [x] 用例 3：风险项配置 CRUD（tests/server-api-regression.test.md）
- [x] 用例 4：差旅成本配置 CRUD（tests/server-api-regression.test.md）
- [x] 用例 5：配置聚合接口（tests/server-api-regression.test.md）

## 项目评估模块

- [x] 用例 6：项目报价计算（tests/server-api-regression.test.md）
- [x] 用例 7：项目创建与持久化（tests/server-api-regression.test.md）
- [x] 用例 8：模板列表与复用（tests/server-api-regression.test.md）

## 已发现问题

1. 风险项配置更新未校验 `options_json`（已修复）
	- 接口：`PUT /api/config/risk-items/:id`
	- 处理：控制层新增 `options_json` 解析校验，非法 JSON 返回 400 错误

2. 模板筛选接口未支持 `is_template` 查询（已修复）
	- 接口：`GET /api/projects?is_template=1`
	- 处理：控制层根据 query 参数返回模板或普通项目，不合法值返回 400
