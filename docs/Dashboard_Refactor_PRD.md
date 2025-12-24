# Dashboard Refactor PRD (Personal Workstation Edition)

**Version:** 2.3
**Date:** 2025-12-23
**Status:** Approved

## 1. 设计理念

本 Dashboard 旨在作为 **个人项目评估工作站**，帮助用户回答：
- 我最近的工作量和活跃度如何？
- 我评估的项目主要集中在什么类型（Web3D vs 平台）？
- 这些项目的规模（成本）分布是怎样的？
- 项目中体现出的技术栈重心和主要风险是什么？

## 2. 页面布局与功能详情

页面主要分为两个区域：**Header (Overview)** 和 **Main (Analysis)**。

### 2.1 Header: 业务概览 (Business Overview)

展示核心业务指标，反映工作量分布与近期活跃度。

- **最近30天评估数 (Recent Activity)**
    - 定义：`created_at` 在过去 30 天内的项目数。
    - 展示：数字 + 较上月环比（可选）。
    - 意义：反映近期的工作饱和度。

- **平台类项目数 (SaaS/Platform Projects)**
    - 定义：`project_type = 'standard'` (或非Web3D) 的项目总数。
    - 展示：数字。
    - 意义：SaaS/管理系统类业务的存量。

- **Web3D 项目数 (Web3D Projects)**
    - 定义：`project_type = 'web3d'` 的项目总数。
    - 展示：数字。
    - 意义：3D/数字孪生类业务的存量。

- **知识库资产 (Knowledge Assets)**
    - 定义：核心配置项数量。
    - 内容：
        - **风险库**: `config_risk_items` 数量。
        - **角色库**: `config_roles` 数量。
        - **Web3D方案**: `web3d_risk_items` 数量 (技术方案) + `web3d_workload_templates` 数量 (工作量模板)。
    - 意义：体现业务经验的积累（风险模型、工种储备、3D专项技术方案）。

- **AI 模型支持 (AI Models)**
    - 定义：已接入的 AI 模型配置数量。
    - 内容：
        - **可用模型数**: `ai_model_configs` 表中记录总数。
        - **当前模型**: 正在启用的模型名称 (`is_current=1`)。
    - 意义：展示系统的智能化集成能力。

### 2.2 Main: 趋势与特征 (Trends & Characteristics)

分为左右两栏布局。

#### A. 左侧：趋势与宏观视角 (Macro View)

1.  **月度业务趋势 (Monthly Trend)**
    - **类型**: 双轴图 (Dual Axes)。
    - **X轴**: 月份 (近12个月)。
    - **Y轴(左)**: 项目数量 (柱状)。
    - **Y轴(右)**: 平均成本 (折线) & 平均风险分 (折线)。
    - **洞察**: 业务量走势 vs 项目规模/难度走势。

2.  **业务热点词云 (Keyword Cloud)**
    - **类型**: 词云。
    - **数据**: 项目名称 + 描述。
    - **洞察**: 近期关注的业务关键词（如“大屏”、“数字孪生”）。

3.  **项目成本区间 (Cost Range Distribution)**
    - **类型**: 直方图 (Histogram) / 柱状图。
    - **X轴**: 成本区间 (e.g., <50w, 50-100w, 100-300w, >300w)。
    - **Y轴**: 项目数量。
    - **洞察**: 项目规模的分布情况（主力项目是小单还是大单）。

#### B. 右侧：微观特征与偏好 (Micro View)

1.  **项目特征雷达 (Project DNA)**
    - **类型**: 雷达图。
    - **维度**: Cost, Risk, Workload, Complexity (Tech Factor), Delivery (Time Factor)。
    - **洞察**: 项目的整体“性格”（高风险型、人力密集型等）。

2.  **核心投入角色 (Top Roles)**
    - **类型**: 条形图 (Bar Chart)。
    - **数据**: 累积工时 Top 5 的角色。
    - **洞察**: 我的评估中主要依赖哪些技术工种。

3.  **高频风险项 (Top Risks)**
    - **类型**: 条形图 (Bar Chart)。
    - **数据**: 出现频率最高的 Top 5 风险。
    - **洞察**: 哪些风险是我最常识别到的。

## 3. 接口需求 (API Requirements)

### 3.0 Dashboard 数据口径与过滤规则 (Backend Scope)

- **统计对象**: `projects` 表中的项目记录。
- **模板处理**: Dashboard 统计 **默认排除** `is_template = 1` 的模板项目。
- **删除数据**: 当前项目删除为 **真删除**（SQL `DELETE`），因此无需额外处理“已删除/垃圾数据”的过滤口径。
- **时间范围**:
  - **最近30天评估数**: 固定为 `created_at` 在过去 30 天内。
  - **月度趋势**: 固定为近 12 个月（按月聚合）。
  - **其余未在 PRD 指定时间范围的统计**: 默认不限制时间范围（全量历史数据）。
- **项目类型兜底**: `project_type` 为 `NULL` 或其它未知值时，统一按 `standard` 口径归类。

| 接口路径 | 方法 | 描述 | 数据源逻辑 |
| :--- | :--- | :--- | :--- |
| `/api/dashboard/overview` | GET | 获取 Header 数据 | 聚合 recent_30d, saas_count, web3d_count, risk_count, role_count, web3d_config_count, ai_model_count |
| `/api/dashboard/trend` | GET | 获取月度趋势 | Group By Month: count, avg(cost), avg(risk) |
| `/api/dashboard/cost-range` | GET | 获取成本区间 | 根据 final_total_cost 分桶统计 |
| `/api/dashboard/keywords` | GET | 获取词云数据 | name & description 分词统计 |
| `/api/dashboard/dna` | GET | 获取雷达图数据 | Avg: cost, risk, workload, tech, delivery |
| `/api/dashboard/top-roles` | GET | 获取 Top 角色 | 累加 role_costs / workload |
| `/api/dashboard/top-risks` | GET | 获取 Top 风险 | 计数 risk_items |

### 3.1 API Response Contracts (Schema & Examples)

- **统一成本单位**: 本 Dashboard API 中涉及成本的字段，均以 **万元（wan）** 表示。
- **Top 口径**:
  - **Top Roles**: 按角色累计 **workload_days（人天）** 排序取 Top 5。
  - **Top Risks**: 当前仅统计“配置风险库对应的风险项”，暂不纳入 `ai_unmatched_risks` 与 `custom_risk_items`（后续可扩展）。

#### GET `/api/dashboard/overview`

```json
{
  "recent_30d": 3,
  "saas_count": 12,
  "web3d_count": 5,
  "knowledge_assets": {
    "risk_count": 28,
    "role_count": 9,
    "web3d_risk_count": 16,
    "web3d_workload_template_count": 34
  },
  "ai_models": {
    "total": 2,
    "current_name": "gpt-4o-mini"
  }
}
```

#### GET `/api/dashboard/trend`

```json
[
  {
    "month": "2025-01",
    "project_count": 2,
    "avg_total_cost_wan": 86.5,
    "avg_risk_score": 37
  },
  {
    "month": "2025-02",
    "project_count": 1,
    "avg_total_cost_wan": 120,
    "avg_risk_score": 42
  }
]
```

#### GET `/api/dashboard/cost-range`

```json
[
  { "range": "<50", "count": 4 },
  { "range": "50-100", "count": 6 },
  { "range": "100-300", "count": 3 },
  { "range": ">300", "count": 1 }
]
```

#### GET `/api/dashboard/keywords`

```json
[
  { "word": "数字孪生", "weight": 12 },
  { "word": "大屏", "weight": 8 }
]
```

- **通用词/噪声词过滤（Stopwords，方案A）**:
  - **最小词长**: 默认过滤长度 `< 2` 的 token（例如 `v`）。
  - **字符清洗**: 过滤纯数字/纯符号 token；英文统一转小写。
  - **停用词表**: 后端内置默认 stopwords，并允许通过本地配置文件覆盖/追加（例如 `server/config/keyword-stopwords.txt`，UTF-8 编码，一行一个词）。
  - **返回数量**: 过滤后按词频排序，返回 Top 50。
  - **分词实现**:
    - 默认采用轻量规则（不引入额外依赖）：按空白/标点切分后，对连续中文/英文数字串进行归一化与拆分。
    - 后续可选集成 `nodejieba` 以提升中文分词质量；若启用，部署环境可能需要额外的原生编译工具链支持。

##### 轻量分词规则 v1（无需 `nodejieba`）

- **目标**: 在不引入原生依赖的前提下，尽可能从 `name + description` 中提取“业务关键词”，用于词云展示。
- **输入**: `projects.name` 与 `projects.description` 拼接后的文本。
- **输出**: `{word, weight}` 列表（Top 50）。

###### (1) 预处理（Normalization）

- 全角转半角（可选）；统一空白为单空格。
- 英文统一转小写。
- 将常见分隔符统一为空格：`/`、`\`、`|`、`,`、`，`、`。`、`;`、`；`、`:`、`：`、`(`、`)`、`（`、`）`、`[`、`]`、`{`、`}`、`"`、`'`。

###### (2) 保护词（Keepwords，可选但推荐）

- 对于你明确希望“作为整体出现”的词（例如 `数字孪生`、`低代码`、`三维模型`、`大屏`、`web3d`、`gis`、`iot`、`ai`、`soA` 等），维护一份 `keyword-keepwords` 列表。
- 处理策略：在分词前先用 keepwords 做“最长优先命中”，命中的词直接计数并从原文中移除（避免被后续规则拆碎）。
- 建议以本地配置文件维护：`server/config/keyword-keepwords.txt`（UTF-8 编码，一行一个词）。

###### (3) 粗切分（Tokenize）

- 以空白为主切分得到粗 token。
- 对每个粗 token 再按以下正则提取子 token：
  - 连续中文串：`[\u4e00-\u9fa5]+`
  - 连续英文数字串：`[a-z0-9]+(?:[-_.][a-z0-9]+)*`

###### (4) 噪声过滤（Filter）

- 丢弃长度 `< 2` 的 token。
- 丢弃纯数字 token。
- 丢弃版本号/序号模式 token（用于过滤 `v7`、`v1`、`v1.0.0-alpha` 等）：
  - `^v\d+(?:\.\d+){0,3}(?:-[a-z0-9]+)?$`
  - `^\d+(?:\.\d+){1,3}(?:-[a-z0-9]+)?$`
- 丢弃 stopwords 中的词（例如“项目”、“系统”、“平台”、“建设”、“实现”、“支持”、“模块”、“功能”、“方案”、“管理”等）。

###### (5) 统计与排序（Aggregate）

- 以 token 为 key 累加出现次数作为 `weight`。
- 按 `weight` 降序取 Top 50。

###### (6) 迭代更新方式（面向个人工作站）

- 当你发现词云里出现大量“通用词/噪声词”时：将其加入 stopwords。
- 当你发现某些业务词被拆碎（例如“数据治理”变成“数据”“治理”）：将完整词加入 keepwords。
- 后续项目数据更新后，可以重新基于当前 `projects.name/description` 的高频词输出一份候选 stopwords/keepwords，由你确认后更新列表。

###### (7) 初始词库（基于当前全部非模板项目语料，约 32 条）

- **Keepwords（保护词）建议**（优先保证整体出现，避免被拆碎）：
  - 数字孪生
  - 数字化交付
  - 数据采集
  - 数据同步
  - 数据流通
  - 数据要素
  - 数据资产
  - 数据治理
  - 数据质量
  - 交付管控
  - 电子组卷
  - 低代码
  - 动态表单
  - 三维模型
  - 二维码
  - 智慧社区
  - 智慧安防
  - 校园安防
  - 移动端
  - 单点登录
  - 身份认证
  - 应急指挥
  - 生产监控
  - 远程诊断
  - 离线填报
  - 数据仓库
  - 安全管控
  - 等级保护
  - 安全扫描
  - 微服务
  - 并发

- **English Keepwords 建议**（英文 token 直接保留，避免被过滤）：
  - 3d
  - bim
  - gis
  - iot
  - ai
  - j2ee
  - soa
  - revit
  - navisworks
  - ifc
  - fbx
  - cctv
  - ehr

- **Stopwords（停用词）建议**（通用词/噪声词，命中则过滤）：
  - 项目
  - 系统
  - 平台
  - 建设
  - 管理
  - 功能
  - 模块
  - 服务
  - 支持
  - 提升
  - 提供
  - 实现
  - 完成
  - 开展
  - 进行
  - 通过
  - 满足
  - 确保
  - 达到
  - 形成
  - 覆盖
  - 核心
  - 内容
  - 相关
  - 需求
  - 业务
  - 流程
  - 基础
  - 方案
  - 应用
  - 开发
  - 对接
  - 集成
  - 标准
  - 标准化
  - 统一
  - 接口
  - 场景
  - 升级
  - 保障
  - 机制
  - 目标
  - 数据
  - 数字化

- **维护方式（建议）**:
  - 将 keepwords/stopwords 分别维护在独立文件中（`server/config/keyword-keepwords.txt` 与 `server/config/keyword-stopwords.txt`）。
  - 词库变更后，重启后端服务即可生效（可选实现文件监听热加载）。

#### GET `/api/dashboard/dna`

```json
{
  "avg_total_cost_wan": 92.35,
  "avg_risk_score": 41,
  "avg_workload_days": 180.5,
  "avg_tech_factor": 1.12,
  "avg_delivery_factor": 1.05
}
```

- **因子缺失兜底**: 若项目数据中缺失 `tech_factor` / `delivery_factor`，按 `1` 参与平均值计算。

#### GET `/api/dashboard/top-roles`

```json
[
  { "role_name": "高级开发", "workload_days": 52 },
  { "role_name": "项目经理", "workload_days": 18 }
]
```

#### GET `/api/dashboard/top-risks`

```json
[
  { "risk_name": "需求频繁变更", "count": 7 },
  { "risk_name": "关键人员不可用", "count": 5 }
]
```

### 3.2 数据来源映射与计算说明 (Backend Mapping)

#### 3.2.1 projects 表字段与单位

- **项目类型**: `projects.project_type`（`standard` / `web3d`，未知值按 `standard` 归类）。
- **模板过滤**: `projects.is_template = 0`。
- **成本（万元）**: `projects.final_total_cost`。
- **风险分**: `projects.final_risk_score`。
- **工作量（人天）**: `projects.final_workload_days`。
- **文本字段**: `projects.name` + `projects.description`。

#### 3.2.2 `/api/dashboard/overview`

- **recent_30d**: `SELECT COUNT(*) FROM projects WHERE is_template=0 AND created_at >= now-30d`。
- **saas_count**: `SELECT COUNT(*) FROM projects WHERE is_template=0 AND (project_type IS NULL OR project_type NOT IN ('web3d') OR project_type='standard')`。
- **web3d_count**: `SELECT COUNT(*) FROM projects WHERE is_template=0 AND project_type='web3d'`。
- **knowledge_assets**:
  - `risk_count`: `SELECT COUNT(*) FROM config_risk_items`。
  - `role_count`: `SELECT COUNT(*) FROM config_roles`。
  - `web3d_risk_count`: `SELECT COUNT(*) FROM web3d_risk_items`。
  - `web3d_workload_template_count`: `SELECT COUNT(*) FROM web3d_workload_templates`。
- **ai_models**:
  - `total`: `SELECT COUNT(*) FROM ai_model_configs`。
  - `current_name`: `SELECT model_name FROM ai_model_configs WHERE is_current=1`。

#### 3.2.3 `/api/dashboard/trend`

- 按月聚合近 12 个月（`STRFTIME('%Y-%m', created_at)`）。
- `project_count`: `COUNT(*)`。
- `avg_total_cost_wan`: `AVG(final_total_cost)`。
- `avg_risk_score`: `AVG(final_risk_score)`。

#### 3.2.4 `/api/dashboard/cost-range`

- 使用 `projects.final_total_cost`（万元）进行分桶统计：`<50` / `50-100` / `100-300` / `>300`。

#### 3.2.5 `/api/dashboard/keywords`

- 来源：`projects.name` 与 `projects.description`。
- 输出：Top 50 词频。
- **过滤规则（方案A）**:
  - 最小词长 `< 2` 过滤。
  - 过滤纯数字/纯符号 token；英文统一转小写。
  - 内置 stopwords + 可选本地配置文件覆盖/追加（例如 `server/config/keyword-stopwords.txt`）。
  - 分词实现默认轻量规则；后续可选集成 `nodejieba`。

#### 3.2.6 `/api/dashboard/dna`

- `avg_total_cost_wan`: `AVG(projects.final_total_cost)`。
- `avg_risk_score`: `AVG(projects.final_risk_score)`。
- `avg_workload_days`: `AVG(projects.final_workload_days)`。
- `avg_tech_factor` / `avg_delivery_factor`:
  - 从 `projects.assessment_details_json` 中解析（兼容新旧结构）。
  - 优先从新版 `development_workload` / `integration_workload` 数组内读取每个 item 的 `tech_factor` / `delivery_factor`。
  - 若缺失则按 `1` 处理。

#### 3.2.7 `/api/dashboard/top-roles`

- 目标：统计角色累计 `workload_days`（人天），取 Top 5。
- 数据来源：解析 `projects.assessment_details_json`（兼容以下结构）：
  - **新版**: `development_workload[]` / `integration_workload[]`，每个 item 里以 `role_name -> days` 形式出现（排除 `module/description/*_factor` 等非角色字段）。
  - **旧版**: `workload.newFeatures[].roles` 与 `workload.systemIntegration[].roles`。

#### 3.2.8 `/api/dashboard/top-risks`

- 目标：统计风险项出现频次，取 Top 5。
- 当前仅统计“配置风险库对应的风险项”。
- 数据来源（兼容）：
  - **旧版**: `risk_scores`（对象，key 为风险项名称）。
  - **新版**: `risk_items[]`（数组，使用 `item` 字段作为风险项名称）。
- **过滤策略**: 仅保留存在于 `config_risk_items.item_name` 的风险项名称；非配置项（例如 AI 未匹配/自定义）暂不纳入（后续可扩展）。

### 3.3 非功能性要求（性能/缓存/稳定性）

- **性能目标（个人工作站）**:
  - `/api/dashboard/overview`、`/api/dashboard/trend`、`/api/dashboard/cost-range`、`/api/dashboard/dna`: 目标 < 300ms。
  - `/api/dashboard/keywords`、`/api/dashboard/top-roles`、`/api/dashboard/top-risks`: 目标 < 800ms（涉及 JSON 解析与文本处理）。
- **缓存建议（可选）**:
  - 可在 service 层对 Dashboard 聚合结果做内存缓存（TTL 5-30 分钟），以减少重复聚合与文本分词开销。
  - 缓存 key 建议包含：`project_type` / `is_template` 口径与时间范围（如 trend 的近 12 月）。
- **降级策略**:
  - 当 `assessment_details_json` 解析失败时：相关聚合（DNA/TopRoles/TopRisks）跳过该项目，不影响整体接口返回。

### 3.4 遗留接口迁移与清理策略（对应 Step 1.5）

- **迁移原则**: 先保证新 Dashboard 前端完全切换到新接口，再清理旧接口。
- **清理范围**:
  - 仅清理“Dashboard 页面不再使用”的旧接口。
  - 清理前需在前端代码中全局搜索调用点确认无引用。
- **建议流程**:
  - Phase A: 新接口上线并由新前端验证。
  - Phase B: 标记旧接口为 deprecated（保持 1 个版本窗口）。
  - Phase C: 删除旧接口并同步删除对应的 Controller/Service/Model 方法与测试用例。

## 4. 前端组件规划

- **布局**: `GridContent` + `ProCard` (分栏)。
- **图表**: `@ant-design/charts` (DualAxes, WordCloud, Column, Radar, Bar)。

## 5. 开发计划 (Detailed Implementation Steps)

### Phase 1: Backend Implementation (后端实现)

#### Step 1.1: Enhance Dashboard Model (`server/models/dashboardModel.js`)

- **状态**: ✅ 已完成（2025-12-24）
- **交付物**:
  - 新增 New Dashboard 所需查询方法，并用 `// [Dashboard Refactor]` 标识；旧方法保留并标识为 Legacy，便于后续按 Step 1.6 清理。

- **Action**: 为新 Dashboard 7 个接口补齐查询方法（统一口径：默认 `is_template = 0`，未知 `project_type` 按 `standard` 归类）。
- **Details**:
  - **项目筛选基础 where**:
    - standard 口径：`is_template = 0 AND (project_type IS NULL OR project_type = 'standard' OR project_type NOT IN ('web3d'))`
    - web3d 口径：`is_template = 0 AND project_type = 'web3d'`
  - `getRecentProjectCount(days)`:
    - 按 `created_at` 统计最近 N 天项目数（N=30）。
  - `getProjectCountStandard()` / `getProjectCountWeb3d()`:
    - 分别统计 standard 与 web3d 项目数。
  - `getConfigCounts()`:
    - 统计 `config_roles`、`config_risk_items`、`web3d_risk_items`、`web3d_workload_templates` 行数。
  - `getAIModelCount()`:
    - 返回 `ai_model_configs` 的总数与当前模型（`is_current=1` 对应的 `model_name`）。
  - `getTrendLast12Months()`:
    - 按 `STRFTIME('%Y-%m', created_at)` 聚合近 12 个月：`COUNT(*)`、`AVG(final_total_cost)`、`AVG(final_risk_score)`。
  - `getCostBuckets()`:
    - 拉取 `final_total_cost`（万元）用于 `<50/50-100/100-300/>300` 分桶统计。
  - `getAllProjectTextData()`:
    - 拉取 `name`、`description`（用于词云）。
  - `getAllAssessmentDetails()`:
    - 拉取 `assessment_details_json` + 需要的聚合列（`final_total_cost/final_risk_score/final_workload_days`），用于 DNA/TopRoles/TopRisks。

#### Step 1.2: Enhance Dashboard Service (`server/services/dashboardService.js`)

- **状态**: ✅ 已完成（2025-12-24）
- **交付物**:
  - 新增 7 个新接口聚合方法，并用 `// [Dashboard Refactor]` 标识；旧方法保留并标识为 Legacy。
  - 词云分词按“轻量分词规则 v1”落地到代码实现，且词库支持静态文件维护。

- **Action**: 按 3.1/3.2 的 schema 与口径实现聚合逻辑（成本单位：万元）。
- **Details**:
  - `getOverview()`:
    - 组合 `recent_30d`、`saas_count`、`web3d_count`、`knowledge_assets.*`、`ai_models.*`。
  - `getTrend()`:
    - 返回近 12 个月数组：`month/project_count/avg_total_cost_wan/avg_risk_score`。
  - `getCostRange()`:
    - 依据 `final_total_cost`（万元）分桶，返回固定顺序的 4 桶。
  - `getKeywords()`:
    - 使用“轻量分词规则 v1（无需 nodejieba）”统计词频，返回 Top 50。
    - 词库来源：
      - **文件优先**：只要 `server/config/keyword-stopwords.txt` 或 `server/config/keyword-keepwords.txt` 任一存在，则以文件内容为准（不存在的那一个视为“空列表”）。
      - **回退策略**：当两个文件都不存在时，使用内置默认列表（与 PRD 初始词库一致）。
  - `getDNA()`:
    - `avg_total_cost_wan`/`avg_risk_score`/`avg_workload_days` 直接对 `projects` 聚合列求平均。
    - `avg_tech_factor`/`avg_delivery_factor` 从 `assessment_details_json` 解析：缺失按 `1`。
  - `getTopRoles()`:
    - 从 `assessment_details_json` 解析并累计角色 `workload_days`，排序取 Top 5。
  - `getTopRisks()`:
    - 从 `assessment_details_json` 中提取风险项名称并计数（兼容 `risk_scores` 与 `risk_items[]`）。
    - 使用 `config_risk_items.item_name` 做白名单过滤（仅统计配置风险库对应风险项）。
  - **容错**:
    - JSON 解析失败时跳过该条记录，不影响接口整体返回。
  - **缓存（可选）**:
    - 可对上述结果加 TTL 内存缓存（5-30 分钟），减少重复解析与分词开销。

#### Step 1.3: Update Dashboard Controller (`server/controllers/dashboardController.js`)

- **状态**: ✅ 已完成（2025-12-24）
- **交付物**:
  - 新增 7 个新接口 Controller 方法，并用 `// [Dashboard Refactor]` 分区标识；旧方法保留并标识为 Legacy。

- **Action**: 暴露新 Dashboard 7 个接口（保持 3.1 的返回结构）。
- **Details**:
  - 新增方法：
    - `getOverview`
    - `getTrend`
    - `getCostRange`
    - `getKeywords`
    - `getDNA`
    - `getTopRoles`
    - `getTopRisks`
  - 错误处理：异常返回 500，并输出可定位的错误信息（不暴露敏感信息）。

#### Step 1.4: Register Routes (`server/routes/dashboard.js`)

- **状态**: ✅ 已完成（2025-12-24）
- **交付物**:
  - 新旧路由并存：新增新接口路由（带中文注释，命名与 PRD 一致），Legacy 路由保留。

- **Action**: 注册新路由并保持路径与 3.0 表格一致。
- **Details**:
  - `GET /api/dashboard/overview`
  - `GET /api/dashboard/trend`
  - `GET /api/dashboard/cost-range`
  - `GET /api/dashboard/keywords`
  - `GET /api/dashboard/dna`
  - `GET /api/dashboard/top-roles`
  - `GET /api/dashboard/top-risks`

#### Step 1.5: Add/Update Tests (`server/tests/*`)

- **状态**: ✅ 已完成（2025-12-24）
- **交付物**:
  - 为新接口补充 smoke tests（200 + 结构校验），并补齐测试 DB schema。
  - 已执行 `server/` 下 `npm test`，测试通过。

- **Action**: 补齐新接口的单测与 API 测试，确保返回结构稳定。
- **Details**:
  - 新增或更新：
    - `dashboardService.test.js`: 覆盖 Overview/Trend/CostRange/Keywords/DNA/TopRoles/TopRisks 的关键逻辑。
    - `dashboardAPI.test.js`: 覆盖 7 个 endpoint 的 200 返回与字段存在性校验。
  - 对 `keywords`/`dna`/`top-*`：增加包含无效 JSON 的容错用例（应跳过而非报错）。

#### Step 1.6: Cleanup Legacy APIs (清理废弃接口)

- **状态**:
  - Phase A: ✅ 已完成（新接口已上线）
  - Phase B: ✅ 已完成（Legacy 路由已标记 deprecated）
  - Phase C: ⏳ 待前端完成切换后执行（删除旧接口 + 同步删除对应 Controller/Service/Model/Tests）
- **交付物**:
  - `server/routes/dashboard.js` 中 Legacy 区块已添加 `Deprecated` 注释。
  - 已生成旧接口调用点清单：`docs/promote/dashboard_legacy_api_callsites.md`（用于后续删除）。

- **Action**: 按 3.4 的迁移策略分阶段清理旧 Dashboard 接口。
- **Details**:
  - Phase A（上线期）: 新接口上线并完成前端切换验证。
  - Phase B（过渡期）: 旧接口标记 deprecated（保留 1 个版本窗口）。
  - Phase C（清理期）: 删除旧接口（例如历史的 `summary/risk-distribution/cost-trend/...`）及对应 Controller/Service/Model/Tests。

### Phase 2: Frontend Implementation (前端实现)

#### Step 2.1: Update Service Layer (`src/services/dashboard.ts`)
- **Action**: Define types and fetchers.
- **Details**:
    - Define TypeScript interfaces for new API responses.
    - Add request methods for all new endpoints.

#### Step 2.2: Component Implementation
- **Action**: Create visualization components.
- **Details**:
    - `OverviewCards`: Display Header metrics.
    - `TrendChart`: DualAxes chart.
    - `CostRangeChart`: Column chart.
    - `ProjectRadar`: Radar chart.
    - `WordCloudChart`: WordCloud chart.
    - `TopBarChart`: Reusable Bar chart for Roles/Risks.

#### Step 2.3: Page Assembly (`src/pages/Dashboard/index.tsx`)
- **Action**: Reconstruct page layout.
- **Details**:
    - Use `GridContent` and `ProCard`.
    - Integrate components and connect data.
