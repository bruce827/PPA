# 后端 ORM 改造与 SQLite → PostgreSQL 迁移方案

目标：在现有 SQLite 架构下，先引入 ORM 与统一数据访问层，为 Beta 版本从 SQLite 平滑迁移到 PostgreSQL（下文简称 PG），尽量减少对 `controllers/ → services/ → models/` 这一分层的侵入和重写成本。

> 说明：本方案只作为设计文档，当前阶段不改动任何运行中代码。

---

## 一、现状简要梳理

- 数据库
  - 运行时主库：`server/ppa.db`（SQLite）
  - 初始化脚本：`server/init-db.js`（直接使用 `sqlite3` 原生 API）
  - 迁移脚本：`server/migrations/*.js`（同样直接连 SQLite）
  - 测试库：`server/ppa.test.db`（由测试脚本管理）
- 数据访问入口
  - `server/config/database.js`：导出 `getDatabase/closeDatabase`，基于 `sqlite3.Database`，回调风格，仅 `projectModel` 使用。
  - `server/utils/db.js`：封装了 `init/get/all/run/close`，Promise 风格，大部分 model 使用。
  - 两套 database helper 并存，且都强绑定 SQLite。
- models 层（数据访问）
  - `projectModel.js`：用 `getDatabase()` 直接写 SQL（回调 + 手动 Promise）。
  - `configModel.js / dashboardModel.js / aiModelModel.js / aiPromptModel.js / promptTemplateModel.js / aiAssessmentLogModel.js`：依赖 `../utils/db`，以 `db.get/db.all/db.run` + 手写 SQL 为主。
  - SQL 中存在部分 SQLite 特有函数：
    - `datetime('now')`（插入日志时间）
    - `STRFTIME('%Y-%m', created_at)`（`dashboardModel.getCostTrend` 聚合按月）
- 领域特点
  - 以配置类表 + 项目表为主：
    - `projects`（含 `assessment_details_json`）
    - `config_roles / config_risk_items / config_travel_costs`
    - `prompt_templates / ai_prompts / ai_assessment_logs / ai_model_configs`
  - 多个 JSON 类字段（目前以 `TEXT` 存储）：
    - `assessment_details_json`
    - `options_json`
    - `variables_json` 等

结论：当前模型层本质是“轻量 DAO + 手写 SQL”，强依赖 SQLite 方言。要迁移到 PG，**先要把“SQLite 方言 + SQL 文本”收敛到一个 ORM/数据访问层**，再切换底层数据库会更安全可控。

---

## 二、总体思路（选型与分层）

### 2.1 ORM 选型建议：Prisma

综合考虑后，建议在该项目中采用 **Prisma** 作为 ORM/数据访问层：

- 同时支持 SQLite 与 PostgreSQL，且迁移路径成熟。
- Schema 驱动，类型清晰，后续若前后端都用 TS，可享受完整类型支持。
- 提供迁移工具（`prisma migrate`）替代当前零散的 JS migration 脚本。
- 支持 JSON 字段映射，后续从 `TEXT` 升级到 PG 的 `JSONB` 有标准做法。

> 说明：Prisma 的 schema 中 `provider` 在同一环境下只能是一个（例如 `sqlite` 或 `postgresql`），因此迁移策略是：
> - Alpha 阶段：`provider = "sqlite"`，仍跑在 SQLite 上；
> - Beta 迁移前：调整为 `provider = "postgresql"`，在 PG 上跑；
> - 不追求“同一套 schema 同时连两种数据库”这种复杂模式。

如果后期希望更偏传统 ORM 模式（如 ActiveRecord）且更易多方言切换，也可以在执行阶段考虑 Sequelize/Objection.js + Knex 等替代方案，但本方案默认以 Prisma 为主路线。

### 2.2 分层目标

保持现有三层职责不变，只在 models 层下钻：

- controllers：控制 HTTP 输入输出及校验，不直接碰 ORM。
- services：封装业务逻辑，组合多个 model 调用。
- models：从“手写 SQL + sqlite3”逐步演进为“基于 ORM Client 的 Repository/DAO”。
- 新增一层“ORM 适配层”：
  - 例如：`server/orm/prismaClient.js` 提供统一的 `prisma` 实例。
  - models 仅通过 `prisma` 访问数据库，不直接依赖 `sqlite3` 或 `pg`。

---

## 三、阶段性实施计划

### 阶段 0：统一 SQLite 封装到 `utils/db`

> 目标：先消除双轨封装，只保留一套 `utils/db`，为后续 ORM 和数据库迁移打好最小“地基”。

- 梳理并改造当前仍使用 `config/database.js` 的代码：
  - `server/models/projectModel.js`：改为通过 `const db = require('../utils/db')` 调用 `db.get/db.all/db.run`，函数签名保持不变。
  - `server/controllers/healthController.js`：改为使用 `utils/db` 做健康检查（确保在 server 启动时已调用 `db.init()`）。
- 调整 `config/database.js` 的定位：
  - 在 README/注释中标记为“Deprecated”，新代码禁止再引用；
  - 保留一小段时间以便回退，等确认无使用后可以删除。
- 统一初始化与关闭逻辑：
  - 在 `server/index.js` 中确保只通过 `utils/db.init()` 进行连接初始化；
  - 进程退出时统一调用 `utils/db.close()`，避免与 `closeDatabase()` 混用。

> 完成这一阶段后，全项目对 SQLite 的访问路径统一为 `utils/db`，后续 ORM 只需要替换/封装这一处。

### 阶段 1：约束新增代码，避免加深技术债（可以立即执行的规范）

> 不改行为，仅约束未来增量开发，在“单一封装”的基础上防止继续绑死 SQLite。

- 新增后端数据访问时：
  - 一律以 `server/utils/db.js` 为入口（Promise 版），不要再直接使用 `sqlite3.Database` 或新建其他 DB helper。
  - 尽量避免使用 SQLite 特有函数（`datetime('now')` 等），能用应用层逻辑处理的统一在 Node 层。
- 新增 SQL：
  - 禁止再引入新的 `STRFTIME` 等方言函数。
  - 聚合/统计尽量在 Node 层处理，或写成以后容易用 ORM 表达的形式。

> 目的：在真正引入 ORM 之前，先“止血”，防止更多 SQLite 方言渗透。

### 阶段 2：引入 Prisma 基础设施（仍使用 SQLite）

> 目标：在不影响业务的前提下，把 Prisma 接入进来，仅做“旁路”验证。

1. 新增依赖（未来执行时）  
   - 在 `server` 下安装 Prisma 及 Client：
     - `npm install prisma @prisma/client --save`
     - `npx prisma init`
2. schema 初始化（对现有 `ppa.db` 做 introspection）
   - 在 `prisma/schema.prisma` 中先配置：
     - `provider = "sqlite"`
     - `url = env("DATABASE_URL")`，并将当前 SQLite 路径声明为 `DATABASE_URL="file:./ppa.db"`。
   - 使用 `npx prisma db pull` 从现有 `ppa.db` 反向生成模型：
     - 将得到与 `projects/config_roles/...` 对应的模型定义。
   - 针对 JSON 字段：
     - 初期保持为 `String`（与当前 TEXT 一致），避免一次性动数据结构；
     - 日后切 PG，再考虑升级为 `Json` 类型。
3. 引入统一 ORM Client
   - 新建 `server/orm/prismaClient.js`：
     - 封装 `const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); module.exports = prisma;`
   - 不在 controllers/services 中直接 require Prisma，只在 models 层使用。
4. 验证
   - 新增一个“只读”小功能做试点（例如：后台隐藏路由，返回 `projects` 数量）：
     - 由 service 调用新的基于 Prisma 的 model 函数；
     - 不修改现有逻辑，只作为对比或调试使用。

> 阶段 1 的关键是：**把 Prisma 引入进项目，确保能在现有 SQLite 上运行**，但不重写现有 models。

### 阶段 2：重构 models 层为 ORM Repository（保持 SQLite）

> 目标：在不改 controllers/services 接口的前提下，用 Prisma 重写 models 内部实现。

重构策略：逐个模块替换，避免一次性大改。

1. 统一数据访问入口
   - 约定 models 层全部使用 `prisma`：
     - 后续逐步淘汰 `server/config/database.js` 和 `server/utils/db.js`。
   - 可以先在 `utils/db.js` 里增加一层过渡适配（例如内部调用 Prisma），再慢慢在 models 中移除对 `utils/db` 的依赖。
2. 以模块为单位重写（示例）
   - `projectModel.js`
     - 保持导出函数签名不变（例如 `createProject(projectData)`）。
     - 内部改为：
       - `prisma.project.create({ data: {...} })`
       - `prisma.project.findUnique({ where: { id } })`
       - `prisma.project.findMany({ where: { is_template: 0 }, orderBy: { created_at: 'desc' } })` 等。
     - `assessment_details_json` 字段仍以字符串存储，model 层只负责透传，不在此阶段强行 JSON.parse。
   - `configModel.js`
     - 将 `config_roles/config_risk_items/config_travel_costs` 的增删改查改写为 Prisma 调用。
   - `dashboardModel.js`
     - 需要特别处理 `getCostTrend` 与 `getRiskDistribution` 此类聚合：
       - SQLite 方言的 `STRFTIME` 应改为：
         - 先用 Prisma 查询基础数据（如 `created_at`、`final_total_cost`）；
         - 再在 Node 层按月分组/聚合；
         - 或使用 Prisma 的 `groupBy` 能力（注意与 PG 的兼容）。
   - `aiModelModel.js / aiPromptModel.js / promptTemplateModel.js / aiAssessmentLogModel.js`
     - 同样策略，用 Prisma 重写增删改查和事务逻辑（`setCurrentModel` 的事务可用 `prisma.$transaction`）。
3. 事务统一
   - 目前有手写事务逻辑（`BEGIN TRANSACTION/COMMIT/ROLLBACK`）：
     - 全部改为 `prisma.$transaction([...])`。
   - 保证 PG 切换后事务语义一致。
4. 清理旧的 SQLite 依赖
   - 当所有 models 已不再使用 `utils/db` 和 `config/database.js`：
     - 标记这两个文件为“Deprecated”，但可以保留一段时间以防回退；
     - 新增开发规范：禁止直接使用 `sqlite3`。

> 阶段 2 完成后：**在 SQLite 上运行的整个后端将通过 Prisma 访问数据库**，但对外 API 行为保持不变。

### 阶段 3：抽象数据库配置，做好 PG 切换准备

> 目标：让“连接哪个数据库”变成纯配置问题。

1. 环境变量规范
   - 统一使用 `DATABASE_URL` 指定连接串：
     - 开发环境（SQLite）：`DATABASE_URL="file:./ppa.db"`
     - Beta/生产环境（PG 示例）：`DATABASE_URL="postgresql://user:pass@host:5432/ppa?schema=public"`
   - 新增一个可选变量 `DB_PROVIDER`（`sqlite|postgresql`）：
     - 主要用作文档与脚本提示，不直接在代码中 switch（Prisma provider 由 schema 决定）。
2. 脚本与测试
   - 现有 `init-db.js` 和 `server/migrations/*.js`：
     - 后续由 Prisma migration 替代，迁移脚本演进为：
       - `npx prisma migrate dev`（开发）
       - `npx prisma migrate deploy`（生产/Beta）
   - 测试库
     - 当前测试使用独立 SQLite 文件：
       - 短期仍使用 SQLite（方便本地跑得快）；
       - Beta 前，可以增加一套针对 PG 的 CI 流程（预生产库，用同一 Prisma schema）。
3. 避免新的方言绑定
   - 在重构 models 时就避免新引入 PG 特有函数（例如 `date_trunc`）；
   - 若必须用方言（复杂统计图表），统一封装在单独的数据访问模块里，并预留 SQLite/PG 两套实现，避免散落在各 model 中。

### 阶段 4：从 SQLite 切换到 PostgreSQL（Beta）

> 目标：一轮可回滚的数据迁移 + 行为验证。

1. 建立 PG 实例
   - 创建 `ppa` 数据库和 `ppa_test` 测试数据库；
   - 配置好 `DATABASE_URL`，只改环境变量，不动应用代码。
2. 调整 Prisma Schema
   - 将 `provider` 从 `"sqlite"` 改为 `"postgresql"`；
   - 视情况将部分 JSON 字段类型从 `String` 改为 `Json`：
     - `assessment_details_json`
     - `options_json`
     - `variables_json` 等
   - 使用 `prisma migrate dev` 或 `prisma migrate deploy` 在 PG 上创建 schema。
3. 数据迁移（一次性）
   - 编写一个专用迁移脚本（Node 工具）：
     - 读取 SQLite 数据（可直接用旧的 `sqlite3` 或 Prisma 连接 SQLite）；
     - 按表顺序写入 PG（使用 Prisma 连接 PG）；
     - 保证主键/外键/唯一约束一致。
   - 对 JSON 字段：
     - 如果在 PG 上定义为 `Json/JsonB`，迁移脚本需把原 TEXT 解析为对象；
     - 若解析失败，可以记录日志并跳过个别异常记录。
4. 验证与灰度
   - 在 Beta 环境：
     - 跑一轮 `npm test`（指向 PG 测试库）；
     - 人工验证关键业务链路（创建项目、评估计算、配置管理、AI 调用日志等）。
   - 逐步将生产流量切到 PG（若有多个环境）。
5. 回滚预案
   - 保留 SQLite 只读副本；
   - 若 PG 上发现重大问题，可快速切回 SQLite（通过环境变量 + 旧版本镜像）。

---

## 四、针对当前 models 的具体改造要点

> 下述为设计说明，**不是当前要执行的改动**。

### 4.1 `projectModel.js`

- 目标：改为使用 `prisma.project`。
- 映射关系：
  - `projects` 表 → Prisma `Project` 模型。
  - 字段保持一一对应（`is_template/final_total_cost/...`）。
  - `assessment_details_json` 先作为 `String`；后续 PG 阶段可升级为 `Json`。
- 函数层面：
  - `createProject` → `prisma.project.create({ data })`。
  - `getProjectById` → `prisma.project.findUnique({ where: { id } })`。
  - `getAllProjects` / `getAllProjectsIncludingTemplates` / `getAllTemplates` → `findMany` + `where/orderBy`。
  - `clearAllTemplateFlags` → `updateMany({ data: { is_template: 0 }, where: { is_template: 1 } })`。
  - `updateProject` / `deleteProject` → `update` / `delete`.

### 4.2 `configModel.js`

- 三张配置表都很标准，适合直接映射为 Prisma 模型：
  - `config_roles`
  - `config_risk_items`
  - `config_travel_costs`
- JSON 类字段：
  - `options_json` 先用 `String`，未来 PG 再以 `Json` 类型存储。
- 特殊逻辑：
  - `getTravelCostPerMonth` 目前用 SQL 聚合，可改为：
    - `prisma.config_travel_costs.aggregate({ _sum: { cost_per_month: true }, where: { is_active: 1 } })`

### 4.3 `dashboardModel.js`

- 所有方法都是统计类：
  - `getProjectCountAndAverage` 可通过 `aggregate` 实现。
  - `getRiskDistribution` 可使用 `groupBy` 或在应用层做分组统计。
  - `getAssessmentDetails` 直接 `findMany` 取出 `assessment_details_json`。
  - `getCostTrend` 需要替换 `STRFTIME`：
    - 方案 A：应用层分组（推荐，兼容 SQLite + PG）；
    - 方案 B：分别为 SQLite/PG 维护方言实现（复杂度略高）。

### 4.4 AI 相关 models

- `aiModelModel.js`
  - 适合用 Prisma 模型 `AiModelConfig`。
  - `setCurrentModel`、`createModel` 中的“唯一 current”逻辑：
    - 使用事务 `prisma.$transaction` 实现“全清零 + 设定指定 ID 为 current”。
  - `updateTestResult` 仍通过 `update` 完成。
- `aiPromptModel.js`
  - 简单查询，可直接映射 `prisma.aiPrompts.findMany/findUnique`。
- `promptTemplateModel.js`
  - 当前有复杂的分页 + 筛选逻辑：
    - 可以先保持为“查询参数组装 + `findMany` + 手动分页”；
    - 或用 Prisma 的 where 组合（`contains/in` 等）实现。
  - `variables_json` 与 `variable_count`：
    - 仍建议在应用层解析 JSON 计算 `variable_count`，避免依赖 DB JSON 函数。
- `aiAssessmentLogModel.js`
  - 简单插入日志记录，可直接 `prisma.aiAssessmentLogs.create`，`created_at` 交由 DB 默认值处理。

---

## 五、风险与收益

### 5.1 风险

- 技术栈引入：Prisma 是一套新的工具链，需要学习成本（尤其是迁移/CLI）。
- 迁移复杂度：
  - 需要重新梳理所有 SQL，尤其是统计类查询。
  - SQLite → PG 的数据迁移需要一次性脚本，稍有不慎会有数据对齐问题。
- 回滚难度：
  - 一旦中途切到 PG，回滚到 SQLite 需要有明确的数据同步策略（建议保持 SQLite 只读备份）。

### 5.2 收益

- 模型层统一：
  - 摆脱零散的 SQL 文本与两套 `database` 工具。
  - 数据表结构在 schema 中显式可见，方便前后端协作。
- 数据库可替换：
  - 将“换数据库”的工作，压缩到“调整 schema provider + 数据迁移脚本”，而不是全项目搜索替换 SQL。
- 类型与维护：
  - 若后续后端改为 TypeScript，Prisma 提供完整类型推断，减少运行时错误。

---

## 六、落地建议（当前可以做的小步）

在“不改代码行为”的前提下，当前阶段可以先做的准备工作：

- 在团队内部达成共识：
  - ORM 方向优先按本方案走 Prisma；
  - 新增 SQL 一律避免方言函数。
- 在 docs 中持续补充：
  - 按表梳理字段说明（可以直接以 `init-db.js` 为基础转成文档），为后续 Prisma schema 设计做准备。
- 规划开发节奏：
  - 推荐在一个独立分支完成“阶段 1 + 阶段 2”的改造，并通过 CI/测试验证后合入；
  - SQLite → PG 的切换（阶段 4）建议放在 Beta 前的一个专项迭代，留足时间做灰度和回滚预案。

以上是基于当前 `server` 目录与 `models` 实现情况设计的一套 ORM 改造与数据库迁移方案，后续如果你确定 ORM 技术栈（比如改用 Sequelize/Knex），我可以再按新的选型帮你把这份方案翻译成对应的落地步骤。
