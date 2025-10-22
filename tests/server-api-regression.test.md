# 测试脚本：Server API 回归验证

## 测试信息

- **测试日期**: 2025-10-21
- **测试环境**: 本地开发 (Node.js 18+, SQLite)
- **应用版本**: `fix_request` 分支最新提交
- **测试范围**: 参数配置模块（角色、风险项、差旅成本、聚合查询）与项目评估模块（报价计算、项目 CRUD、模板复用）

## 测试目标

确保服务端重构后所有公开 API（健康检查、配置管理、项目评估计算、项目 CRUD、导出能力）均符合 PRD 规范与前端 `src/services/*` 调用契约，重点覆盖报价计算逻辑与数据持久化一致性。

## 前置条件

- `cd server && yarn install`
- `node init-db.js` 初始化表结构（若未执行）
- `node seed-data/seed-all.js` 加载默认角色/差旅成本数据
- 启动服务 `node index.js`，确认日志 `Successfully connected to the SQLite database.`
- 保证 `server/ppa.db` 对当前测试唯一且备份完成
- 准备 API 调试工具（Bruno/Postman/curl）或自动化脚本（SuperTest）

## 测试用例

### 用例 2：角色配置 CRUD

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:  

1. `GET /api/config/roles` → 返回默认种子数据  
2. `POST /api/config/roles` (payload: `{ "role_name": "测试角色", "unit_price": 150000 }`) → 返回 `{id}`  
3. `PUT /api/config/roles/{id}` → 更新价格为 200000，返回 `{updated:1}`  
4. `DELETE /api/config/roles/{id}` → 返回 `{deleted:1}`  
5. 最终 `GET` 验证新增记录已删除

**测试数据**: `role_name=测试角色`  
**验证点**:  

- [ ] 单位价格以元为单位存储，返回列表保持原值  
- [ ] 非法输入（缺少字段、价格为负）触发 400 或 500  
- [ ] 删除不存在 ID 返回 `{deleted:0}`

---

### 用例 3：风险项配置 CRUD

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:  

1. `GET /api/config/risk-items` → 列表为空或现有数据  
2. `POST` 新建 `{ "category": "交付风险", "item_name": "供应商依赖", "options_json": "[{\"label\":\"低\",\"score\":5}]" }`  
3. `PUT` 更新 `options_json`  
4. `DELETE` 清理  
5. 构造 `options_json` 非法 JSON 验证错误处理

**测试数据**: 如上  
**验证点**:  

- [ ] 新增/修改时 JSON 原样保存  
- [ ] 删除后 GET 不再返回  
- [ ] JSON 解析失败时返回明确错误

---

### 用例 4：差旅成本配置 CRUD

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:  

1. `GET /api/config/travel-costs` → 包含种子项  
2. `POST` `{ "item_name": "测试差旅", "cost_per_month": 5000, "is_active":1 }`  
3. `PUT` 调整金额并验证  
4. `DELETE` 清理  
5. 关闭 `is_active` 后确认 `getTravelCostPerMonth` 不再计入（通过计算接口验证）

**验证点**:  

- [ ] 列表保持金额整数  
- [ ] `is_active` 字段默认 1（若存在）  
- [ ] 删除不存在 ID 行为

---

### 用例 5：配置聚合接口

**优先级**: 低  
**类型**: 功能测试

**测试步骤**:  

1. `GET /api/config/all` → 返回 `{ data: {roles, risk_items, travel_costs} }`  
2. 确认与单独查询结果一致  
3. 当任一子查询报错时整体返回 500

**验证点**:  

- [ ] 三类列表结构完整  
- [ ] 性能：响应时间 < 500ms（本地）

---

### 用例 6：项目报价计算

**优先级**: 特高  
**类型**: 功能+业务逻辑

**测试步骤**:  

- 步骤 1：准备 assessment payload。  

```json
{
  "risk_scores": {"1":10,"2":20},
  "roles": [{"role_name":"项目经理","unit_price":120000},{"role_name":"开发工程师","unit_price":90000}],
  "development_workload": [{
    "level1_module":"核心功能",
    "delivery_factor":1.2,
    "项目经理":3,
    "开发工程师":10,
    "scope_factor":1.1,
    "tech_factor":1.0
  }],
  "integration_workload": [],
  "travel_months": 2,
  "travel_headcount": 3,
  "maintenance_months": 3,
  "maintenance_headcount": 1,
  "maintenance_daily_cost": 2500,
  "risk_items": [{"cost": 5}]
}
```  

- 步骤 2：`POST /api/calculate` → 保存响应。  

- 步骤 3：手工计算对照。  
  - 风险因子 `0.3` (30/100)  
  - 工作量：PM 3天+Dev 10天=13，交付×1.2 → 15.6 天  
  - 成本：  
    - PM: `(120000/10000) × 3 × 1.2 × 1.1 ≈ 4.75`  
    - Dev: `(90000/10000) × 10 × 1.2 × 1.1 ≈ 11.88`  
    - 合计 ≈ 16.63。由于实现对成本另乘 `delivery_factor × rating_factor × scope_factor × tech_factor`，需按代码逻辑复算并核对取整误差。  

- 步骤 4：验证响应字段 `software_dev_cost`, `travel_cost`, `maintenance_cost`, `risk_cost`, `total_cost`, `total_workload_days`, `risk_score`。  

**验证点**:  

- [ ] 计算结果与手工计算一致（允许 ±1 取整差）  
- [ ] 缺少 `roles` 或 `risk_scores` 时默认 0，不抛异常  
- [ ] `travel_cost_per_month` 来源于配置表（激活项总和）  
- [ ] 维护成本使用默认值 `DEFAULTS.MAINTENANCE_DAILY_COST` 2000（若 payload 未传）

---

### 用例 7：项目创建（含计算持久化）

**优先级**: 高  
**类型**: 集成测试

**测试步骤**:  

1. 使用与用例 6 相同的 assessment 数据，通过 `POST /api/projects` 创建 `{"name":"报价测试","description":"重构验证","is_template":0,"assessmentData":...}`  
2. 验证响应 `{id}`  
3. `GET /api/projects/{id}` → 检查 `final_total_cost`、`assessment_details_json` 与计算结果一致  
4. `GET /api/projects` → 列表包含新项目，字段 `final_total_cost`、`final_risk_score` 正确  
5. `PUT /api/projects/{id}` 修改名称/assessment，验证重新计算后的数值  
6. `DELETE /api/projects/{id}` → 再次 `GET` 确认 404

**验证点**:  

- [ ] 创建/更新时调用 `calculationService`，结果与 /api/calculate 一致  
- [ ] `assessment_details_json` 为原始 JSON 字符串  
- [ ] 删除返回 `{deleted:1}`；再次删除 `{deleted:0}`  
- [ ] 404 错误结构遵循全局 `errorHandler`（`success:false` 等）

---

### 用例 8：模板列表与复用

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:  

1. `POST /api/projects` 创建 `is_template:1` 的模板数据  
2. `GET /api/projects/templates` → 返回模板列表  
3. `GET /api/projects?is_template=1` （若前端仍按旧逻辑）→ 期望 200? 若不支持需记录兼容性风险  
4. `GET /api/templates/templates` → 验证是否存在冗余/错误路由（基于当前路由挂载同一路径，需确认）  
5. 清理模板

**验证点**:  

- [ ] 模板接口返回字段 `id/name/description`  
- [ ] 路由别名 `/api/templates` 是否符合 PRD（若不符合纳入风险）

---

## 风险点识别

- `/api/templates` 路由与 PRD 描述存在差异，需确认前端依赖
- 缺少服务端输入校验，易触发 SQLite 错误
- 大量数值处理无上限校验，需关注数据溢出

## 测试环境信息

- 浏览器版本: 不涉及（API 测试）
- 屏幕分辨率: 不适用
- 操作系统: macOS (Apple Silicon)
- Node.js: 18.x
- SQLite 驱动: `sqlite3@^5`

---

请确认上述测试脚本，若需补充特定场景（如权限、任务队列），我再调整后再开始执行。
