# AI 日志监控系统（v2）Story 拆分与验收检查项

> 规则：本功能按 Story 逐步交付。**每完成一个 Story，我会先给出验收检查项结果并等待你确认“同意继续”后，才会进入下一步开发。**

## 0. 需求边界与约定

### 0.1 范围内

- 模块：系统监控 / AI 日志监控
- 列表页：统计面板 + 筛选区 + 表格（分页/排序）+ 手动刷新 + 实时刷新开关
- 详情页：基础信息 + 请求/响应（Tabs）+ 错误分析 + 文件路径展示
- 后端：
  - `GET /api/monitoring/logs`
  - `GET /api/monitoring/logs/:requestHash`
  - `GET /api/monitoring/stats`
  - `ws://localhost:3001/api/monitoring/logs/live`
- 数据来源：
  - 列表/统计：`ai_assessment_logs` 表
  - 详情：本地文件 `server/logs/ai/`

### 0.2 范围外（本期不做）

- 导出（Excel/PDF）

### 0.3 待确认决策点（如需调整，会在对应 Story 开始前再次确认）

- 状态是否需要 `running`（PRD 示例提到“执行中”，字段表未定义）：
  - A：仅 `success/fail/timeout`（默认建议）
  - B：增加 `running` 并改造调用链（需要更大改动）
- Prompt 模板“详情链接”目标路由（新窗口打开）
- 日志清理机制（默认 90 天）是否本期实现：建议后续独立 Story

---

## Story 0：基础接入与路由占位（最小可访问）

### 目标（Story 0）

- 前端能访问 `/monitoring/ai-logs` 列表页与详情页路由
- 后端 monitoring 路由模块能被挂载（即便先返回占位）

### 交付物（Story 0）

- 前端：新增页面骨架与路由
- 后端：新增 `routes/monitoring`（或等价模块）并挂载到 `/api/monitoring`

### 验收检查项（Story 0）

- [x] 打开 `/monitoring/ai-logs` 不 404
- [x] 页面基础布局可渲染（先空数据也可）
- [x] 后端存在 `/api/monitoring/*` 路由挂载点（可用简单响应验证）
- [x] 响应格式统一 `{ success, data, error }`

---

## Story 1：后端-日志列表查询 API（DB 驱动）

### 目标（Story 1）

实现 `GET /api/monitoring/logs`，支持分页、默认时间降序、多条件筛选（AND）。

### 验收检查项（Story 1）

- [x] 返回结构：`{ total, page, pageSize, list }`
- [x] 默认按时间降序
- [x] 筛选：时间范围、steps、statuses、models、promptId、projectId、searchHash（部分匹配）
- [x] SQL 参数化，避免注入
- 见文末「待验证/待改进清单」

---

## Story 2：后端-统计面板 API（DB 聚合）

### 目标（Story 2）

实现 `GET /api/monitoring/stats`，与列表同筛选条件。

### 验收检查项（Story 2）

- [x] `totalCalls` 与列表 `total` 一致
- [x] `successRate` 计算正确（`total=0` 时口径明确）
- [x] `avgDuration` 计算正确
- [x] `errorDistribution` 分类规则明确且可复现（timeout/parse/network/other）
- 见文末「待验证/待改进清单」

---

## Story 3：后端-日志详情 API（DB + 本地文件读取）

### 目标（Story 3）

实现 `GET /api/monitoring/logs/:requestHash`，读取日志目录文件并返回。

### 验收检查项（Story 3）

- [x] 返回 `index/request/responseRaw/responseParsed/notes`
- [x] 文件缺失返回 `null` 并给出友好提示（接口不 500）
- [x] 防路径穿越（`requestHash` 不得拼出任意路径）
- [x] 优先使用 DB 的 `log_dir` 直达读取（无 `log_dir` 时降级扫描）
- 见文末「待验证/待改进清单」

---

## Story 4：前端-列表页（统计 + 筛选 + 表格）

### 目标（Story 4）

完成列表页 UI 与 Story 1/2 接口联调。

### 验收检查项（Story 4）

- [x] 字段展示符合 PRD（状态标签 success/fail/timeout；耗时显示规则 ms/s；>=10s 红色高亮）
- [x] 手动刷新可用
- [x] 空数据/接口错误提示友好
- 见文末「待验证/待改进清单」

---

## Story 5：前端-详情页（Tabs + 高亮 + 复制 + 折叠）

### 目标（Story 5）

完成详情页 UI 与 Story 3 接口联调。

### 验收检查项（Story 5）

- [x] 基础信息完整：时间、step、hash（可复制）、route、模型、prompt 链接、耗时、timeout、文件路径（可复制）
- [x] 请求/响应 Tabs：JSON 高亮、复制、大文本折叠（>1000 字符）
- [x] 原始响应支持文本搜索
- [x] fail/timeout 显示错误分析与建议
- [x] 任意文件缺失不崩溃

---

## Story 6：实时刷新（WebSocket 全链路）

### 目标（Story 6）

实现 WS 推送新日志，前端实时插入列表顶部并高亮；断线重连与状态指示；失败降级。

### 验收检查项（Story 6）

- [x] WS 连接与订阅协议生效（只推送订阅 steps）
- [x] 新日志插入列表顶部并高亮 3 秒
- [x] 连接状态指示（连接中/已连接/已断开）
- 见文末「待验证/待改进清单」

---

## Story 7：数据库索引与查询性能保障

### 目标（Story 7）

补齐必要索引并验证性能。

### 验收检查项（Story 7）

- [x] 索引增加可重复执行（迁移/幂等）
- 见文末「待验证/待改进清单」

---

## Story 8：测试（Jest + Supertest + WS 基本验证）

### 目标（Story 8）

覆盖三大 API + WS 关键逻辑。

### 验收检查项（Story 8）

- [x] `npm test` 可跑通
- [x] 覆盖：成功/空数据/异常（文件不存在、参数非法等）
- [x] 不依赖真实 AI 调用（可控测试数据）

---

## 待验证/待改进清单（未勾选项汇总）

### Story 1：后端-日志列表查询 API（DB 驱动）

- [ ] 在合理数据量下接口响应 < 500ms

### Story 2：后端-统计面板 API（DB 聚合）

- [ ] 响应 < 200ms

### Story 3：后端-日志详情 API（DB + 本地文件读取）

- [ ] 详情加载 < 300ms

### Story 4：前端-列表页（统计 + 筛选 + 表格）

- [ ] 筛选 500ms 防抖自动查询；重置一键清空
- [ ] 统计与列表随筛选联动刷新

### Story 6：实时刷新（WebSocket 全链路）

- [ ] 自动重连（指数退避）；失败自动降级为静态刷新
- [ ] 消息去重（避免重复插入）
- [ ] 推送延迟 < 100ms（在本机环境下）

### Story 7：数据库索引与查询性能保障

- [ ] 大数据量下分页查询仍可用

## Story 交付节奏（执行规则）

- 每个 Story 开始前：我会说明本次改动范围与影响面
- 每个 Story 完成后：我会提供
  - 已完成内容清单
  - 验收检查项逐条对照
  - 你需要怎么验证（如需要启动前后端）
- 你回复“同意继续（Story X）”后，我才会进入下一个 Story
