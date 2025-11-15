# Server 目录说明（更新版）

> 分支：`feat_cal` 已新增实时计算、导出、模板路由复用与评分因子算法。本文档同步这些实现，提供更完整的 API 与使用指引。

## 📦 目录结构

```text
server/
├── index.js              # 应用入口：加载中间件、路由、错误处理、启动服务
├── index.js.backup       # 应用入口备份文件
├── init-db.js            # 数据库表结构初始化脚本
├── ppa.db                # 主 SQLite 数据库文件（首次连接自动生成）
├── package.json          # 依赖配置
├── config/               # 配置层
│   ├── server.js         # 端口 & 环境变量读取（PORT / NODE_ENV）
│   └── database.js       # 数据库单例管理 (getDatabase / closeDatabase)
├── controllers/          # 路由控制器（拆分业务逻辑与响应）
├── routes/               # 模块化路由定义（health/config/calculate/projects/ai）
├── services/             # 领域服务层（计算、项目、配置、AI服务）
├── models/               # 数据访问层（SQLite SQL 封装）
├── middleware/           # 错误处理等中间件
├── providers/            # AI提供商集成（OpenAI、Doubao等）
├── migrations/           # 数据库迁移脚本
├── scripts/              # 脚本工具
├── tests/                # 测试用例
├── utils/                # 公共工具（常量、评分因子、日志等）
├── seed-data/            # 初始数据脚本（角色 / 差旅 / 风险项）
└── ARCHITECTURE.md       # 详细的技术架构说明文档
```

## 📚 技术架构

详细的技术架构设计说明请参考：[ARCHITECTURE.md](./ARCHITECTURE.md)

该文档包含：
- 分层架构设计详解
- 各层职责与实现
- AI集成架构特点
- 性能优化特性
- 测试架构说明
- 部署与运维指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 初始化数据库与基础数据

```bash
# 创建表结构（幂等，可重复执行）
node init-db.js

# 初始化基础配置（角色 / 差旅 / 风险项）
cd seed-data
node seed-all.js
```

可按需分别初始化：

```bash
node seed-roles.js          # 角色配置
node seed-travel-costs.js   # 差旅成本配置
node seed-risk-items.js     # 风险评估项配置
```

### 3. 启动服务

```bash
cd ..            # 回到 server 根目录
node index.js    # 默认端口 3001（可用 PORT 覆盖）
```

启动后输出：

```text
Server is running on http://localhost:3001
Environment: development
```

### 4. 优雅退出

按 Ctrl+C 会触发 SIGINT，调用 `closeDatabase()` 关闭连接。

## 🧪 环境变量

| 变量 | 默认值 | 说明 |
| ---- | ------ | ---- |
| PORT | 3001   | 服务监听端口 |
| NODE_ENV | development | 运行环境标识（影响日志等） |

## ⚙️ 核心概念

- 单一数据库连接：通过 `config/database.js` 单例复用，避免多实例文件锁冲突。
- 三层结构：Controller → Service → Model，业务与存储解耦，便于后期迁移数据库或加缓存。
- 计算集中：实时成本与工作量计算在 `services/calculationService.js`，评分因子算法在 `utils/rating.js`。
- 模板复用：项目与模板共用一张 `projects` 表，通过 `is_template` 区分。

## 📑 API 总览

分类节点均挂载于 `/api` 前缀下。

### 健康检查

| 方法 | 路径 | 描述 |
| ---- | ---- | ---- |
| GET | /api/health | 服务健康状态 |
| GET | / | 根路径（返回健康信息） |

### 配置（Config）

| 方法 | 路径 | 描述 |
| ---- | ---- | ---- |
| GET | /api/config/roles | 获取角色配置列表 |
| POST | /api/config/roles | 创建角色 |
| PUT | /api/config/roles/:id | 更新角色 |
| DELETE | /api/config/roles/:id | 删除角色 |
| GET | /api/config/risk-items | 获取风险评估项 |
| POST | /api/config/risk-items | 创建风险评估项（含选项 JSON） |
| PUT | /api/config/risk-items/:id | 更新风险评估项 |
| DELETE | /api/config/risk-items/:id | 删除风险评估项 |
| GET | /api/config/travel-costs | 获取差旅成本配置 |
| POST | /api/config/travel-costs | 创建差旅成本条目 |
| PUT | /api/config/travel-costs/:id | 更新差旅成本条目 |
| DELETE | /api/config/travel-costs/:id | 删除差旅成本条目 |
| GET | /api/config/all | 聚合获取全部配置（roles/risk_items/travel_costs） |

### 实时计算（Calculation）

| 方法 | 路径 | 描述 |
| ---- | ---- | ---- |
| POST | /api/calculate | 根据提交的评估表单数据实时计算成本与工作量 |

请求示例（简化）：

```json
POST /api/calculate
{
    "risk_scores": {"架构": 15, "流程": 10},
    "roles": [{"role_name": "前端", "unit_price": 1800}],
    "development_workload": [{"delivery_factor": 1, "前端": 20}],
    "integration_workload": [{"delivery_factor": 1.1, "前端": 8}],
    "travel_months": 2,
    "travel_headcount": 3,
    "maintenance_months": 1,
    "maintenance_headcount": 2,
    "maintenance_daily_cost": 1600,
    "risk_items": [{"cost": 2.5}]
}
```

响应示例（字段单位：金额单位“万元”，单价输入为“元”）：

```json
{
    "data": {
        "software_dev_cost": 12.35,
        "system_integration_cost": 3.27,
        "travel_cost": 6.48,
        "maintenance_cost": 0.69,
        "risk_cost": 2.5,
        "total_cost_exact": 25.29,
        "total_cost": 25,
        "software_dev_workload_days": 20,
        "system_integration_workload_days": 8,
        "maintenance_workload_days": 43,
        "total_workload_days": 71,
        "risk_score": 25,
        "rating_factor": 1.08,
        "rating_ratio": 0.25,
        "risk_max_score": 100
    }
}
```

### 项目 / 模板（Projects & Templates）

| 方法 | 路径 | 描述 |
| ---- | ---- | ---- |
| GET | /api/projects | 获取项目列表（非模板） |
| GET | /api/projects?is_template=true | 使用查询参数获取模板列表（等价于 /api/templates） |
| GET | /api/projects/:id | 获取单个项目 |
| POST | /api/projects | 创建项目（含评估详情 JSON） |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |
| GET | /api/templates | 获取所有模板（路由与 projects 共用） |
| GET | /api/projects/:id/export/pdf | 导出 PDF 报告 |
| GET | /api/projects/:id/export/excel | 导出 Excel 报告 |

创建项目示例：

```json
POST /api/projects
{
    "name": "Demo评估A",
    "description": "用于报价初步评估",
    "is_template": 0,
    "final_total_cost": 25.29,
    "final_risk_score": 25,
    "final_workload_days": 71,
    "assessment_details_json": "{\"roles\":[],\"risk_scores\":{}}"
}
```

响应：

```json
{"id": 12}
```

### 评分因子逻辑（Rating Factor）

风险得分与最大风险分值比值 (ratio) 经分段线性插值 → 因子：

- ratio ≤ 0.8 → 1.0
- 0.8 < ratio ≤ 1.0 → 线性提升到 1.2
- 1.0 < ratio ≤ 1.2 → 继续提升到封顶 1.5

实现位置：`utils/rating.js`；最大分值通过已配置风险项选项 JSON 动态计算。

### 成本计算要点

1. 所有角色单价以“元/人/天”存储，计算时统一换算为“万元”。
2. 工作量计算：各角色天数汇总 × `delivery_factor` → 工作量；成本 = 角色天数 × 单价（万元） × 各倍率（delivery/scope/tech） × rating_factor。
3. 差旅成本：`travel_months * travel_headcount * SUM(active travel_cost_per_month)` （转换万元）。
4. 维护成本：`maintenance_months * maintenance_headcount * WORK_DAYS_PER_MONTH * daily_cost`。
5. 风险成本：直接累加 `risk_items.cost`（万元）。

### 错误处理

- 统一错误处理中间件：`middleware/errorHandler.js`（未显示于本文，但在入口注册）。
- 非法查询参数（例：`is_template=abc`）返回 400。通过在 `projectController.getAllProjects` 中校验。

## ⚠️ 注意事项

- 初始化脚本会清空相关表数据，生产环境慎用 `seed-all.js`。
- 模板与项目共享表结构，扩展新字段时需评估是否对模板/项目都适用。
- `assessment_details_json` 建议保持结构稳定以支持未来回放 / 导出增强。
- 单价与成本的单位换算要一致：前端提交保留“元”，后端输出“万元”字段已四舍五入或保留两位。
- 导出接口可能对大数据量评估耗时增大，可考虑后续生成异步任务与缓存。

## 🔮 后续改进建议

- 增加分页与筛选（当前列表无分页，如果项目多可能性能下降）
- 添加认证与权限（区分模板维护者与评估执行者）
- 使用参数化查询与输入验证增强安全性（当前直接拼接有限参数，需审查风险）
- 引入测试用内存数据库（便于 CI 快速回归）
- 增强导出：加封面页、计算公式说明、风险分布图表
- 增加 `/api/projects/:id/recalculate` 便于旧评估按最新参数重算差异

## ✅ 快速验证步骤

```bash
cd server
node init-db.js
cd seed-data && node seed-all.js && cd ..
node index.js
curl http://localhost:3001/api/health
curl http://localhost:3001/api/config/all
```

## 📝 版本信息

最后更新日期：2025-10-22

