---
title: '项目机会 - 招标网站模块'
slug: 'project-opportunity-bidding-sites'
created: '2026-03-11 11:29:43 +0800'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Frontend: React 18 + TypeScript 5 + UmiJS Max 4.5 + Ant Design 5 + ProComponents'
  - 'Backend: Node.js 16+ + Express 5 + SQLite3 + custom async db wrapper'
  - 'Testing: Jest 30 + Supertest 7'
  - 'AI integration: current AI model config + providerSelector + aiAssessmentLogModel + aiFileLogger'
files_to_modify:
  - 'frontend/ppa_frontend/.umirc.ts'
  - 'frontend/ppa_frontend/src/pages/Opportunity/BiddingSites.tsx'
  - 'frontend/ppa_frontend/src/services/opportunity/index.ts'
  - 'frontend/ppa_frontend/src/services/opportunity/typings.d.ts'
  - 'server/routes/index.js'
  - 'server/routes/opportunity.js'
  - 'server/controllers/opportunityController.js'
  - 'server/services/biddingSiteService.js'
  - 'server/services/biddingSiteValidationService.js'
  - 'server/models/biddingSiteModel.js'
  - 'server/init-db.js'
  - 'server/migrations/005_create_bidding_sites.js'
  - 'server/seed-data/seed-bidding-sites.js'
  - 'server/seed-data/seed-all.js'
  - 'server/tests/biddingSitesAPI.test.js'
  - 'server/tests/biddingSiteValidationService.test.js'
code_patterns:
  - 'Frontend routes are declared centrally in .umirc.ts with nested menu items and component string paths'
  - 'Frontend admin CRUD pages use ProTable or Table + Modal/Form with request wrappers in src/services/{domain}'
  - 'Backend newer modules follow routes -> controllers -> services -> models; older config endpoints sometimes skip service layer'
  - 'SQLite access goes through server/utils/db.js with parameterized queries and result.id/result.changes compatibility'
  - 'Existing AI services often use current model lookup + providerSelector + aiAssessmentLogModel + aiFileLogger; this module keeps the prompt internal to the validation service'
test_patterns:
  - 'API integration tests use Jest + Supertest against exported app with a temporary sqlite database initialized in beforeAll'
  - 'Service/unit tests use jest.mock for model and utility dependencies and assert transformed business results'
---

# Tech-Spec: 项目机会 - 招标网站模块

**Created:** 2026-03-11 11:29:43 +0800

## Overview

### Problem Statement

当前系统缺少“项目机会”业务入口，无法统一维护招标网站清单，也没有对网站地址进行快速验证的能力。现状依赖人工记录和人工判断，不利于后续沉淀项目机会来源，也无法高效识别网站是否可访问、是否可能需要身份认证、是否像有效的招标/采购/公共资源发布站点。

### Solution

新增一级菜单“项目机会”，首个子菜单为“招标网站”。模块提供招标网站基础 CRUD、URL 直达访问和手动触发的 AI 一键验证。首版将 `docs/招标发布网站 .md` 中整理的全部网站作为初始化数据导入系统。

### Scope

**In Scope:**
- 新增一级菜单 `项目机会`
- 新增子菜单 `招标网站`
- 招标网站列表页、查询筛选、新增、编辑、删除
- 网站基础信息维护，包括名称、网址、层级、区域、平台类型、官方属性、备注等
- 列表和详情中的 `访问网址` 动作，直接新标签页打开 URL
- 列表或详情中的 `AI 校验` 动作，手动触发
- AI 校验输出：URL 是否有效、是否可访问、是否跳转、是否疑似需要登录/身份认证、是否像招标/采购/公共资源类网站、说明、置信度
- 将 `docs/招标发布网站 .md` 中全部现有站点导入为初始化数据
- 预留“项目机会”菜单后续扩展其他子菜单

**Out of Scope:**
- 人工复核功能或审批流
- 保存后自动校验、定时任务校验
- 批量导入/导出 UI
- 招标公告抓取、订阅、监控能力
- 登录绕过、验证码处理、账号托管

## Context for Development

### Codebase Patterns

- 已确认不存在现成的“项目机会 / 招标网站”领域代码，属于领域层 clean slate，新模块可以按现有框架新增
- 前端基于 UmiJS Max 路由，在 `frontend/ppa_frontend/.umirc.ts` 中声明一级菜单和子路由
- 配置类页面存在两种可复用模式：
  - `frontend/ppa_frontend/src/pages/Config.tsx` 使用 `ProTable` 驱动基础 CRUD
  - `frontend/ppa_frontend/src/pages/Config/Web3DRisk.tsx` 使用 `Table + Modal + Form` 处理更复杂的表单编辑
- 前端 service 封装统一放在 `src/services/{domain}/index.ts`，配套类型定义在 `typings.d.ts` 或独立 service 类型文件中
- 后端推荐沿用较新的 `routes -> controllers -> services -> models` 四层分离模式，参考 Web3D 模块；不要继续复用旧的 `configController -> configModel` 直连方式
- SQLite 统一通过 `server/utils/db.js` 访问，支持参数化查询，`db.run` 返回 `id / lastID / changes` 兼容结构
- AI 能力已有统一基础设施，新增网站校验更适合复用现有 AI provider / prompt 体系，而不是在前端直接调用第三方接口
- `prompt_templates` 是当前 AI 业务主路径；`ai_prompts` 和 `seed-ai-prompts.js` 更像旧路径/遗留表，不应作为新增网站校验能力的首选扩展点
- 目标返回结构应统一为 `{ success, data, error? }`，虽然现有部分旧接口并未完全遵守

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `frontend/ppa_frontend/.umirc.ts` | 前端菜单和路由入口定义 |
| `frontend/ppa_frontend/src/pages/Config.tsx` | `ProTable` 风格 CRUD 页面参考 |
| `frontend/ppa_frontend/src/pages/Config/Web3DRisk.tsx` | 复杂表单型 CRUD 页面参考 |
| `frontend/ppa_frontend/src/services/config/index.ts` | 前端基础 service 封装风格参考 |
| `frontend/ppa_frontend/src/services/web3d/index.ts` | 新领域 service 组织方式参考 |
| `server/routes/index.js` | 新模块 API 路由挂载入口 |
| `server/routes/web3d.js` | 新模块 REST 路由组织方式参考 |
| `server/controllers/web3dConfigController.js` | 轻控制器写法参考 |
| `server/services/web3dConfigService.js` | 服务层校验与标准化模式参考 |
| `server/models/web3dConfigModel.js` | SQLite model 层参数化查询参考 |
| `server/init-db.js` | 新库初始化表结构入口 |
| `server/migrations/004_web3d_assessment.js` | 既有数据库补表 migration 参考 |
| `server/seed-data/seed-all.js` | 基础数据一键初始化入口 |
| `server/seed-data/seed-web3d.js` | 通过 JS 数组写入默认数据的 seed 模式参考 |
| `server/services/aiProjectTaggingService.js` | 新 AI 服务接入 current model / provider / logging 的完整样板 |
| `server/services/aiRiskAssessmentService.js` | AI 输入校验、变量注入、JSON 输出解析参考 |
| `server/providers/ai/openaiProvider.js` | 项目现有 `http/https` 请求风格参考 |
| `server/tests/aiProjectTaggingAPI.test.js` | API 集成测试 + 临时 sqlite 初始化模式参考 |
| `docs/招标发布网站 .md` | 首版初始化数据来源 |

### Files Likely to Modify/Create

| File | Action | Purpose |
| ---- | ------ | ------- |
| `frontend/ppa_frontend/.umirc.ts` | Modify | 新增一级菜单 `项目机会` 和 `招标网站` 子路由 |
| `frontend/ppa_frontend/src/pages/Opportunity/BiddingSites.tsx` | Create | 招标网站主列表页与操作入口 |
| `frontend/ppa_frontend/src/services/opportunity/index.ts` | Create | 招标网站 CRUD / AI 校验前端请求封装 |
| `frontend/ppa_frontend/src/services/opportunity/typings.d.ts` | Create | 招标网站实体、校验结果和接口返回类型 |
| `server/routes/index.js` | Modify | 挂载 `opportunity` 模块 API |
| `server/routes/opportunity.js` | Create | 招标网站 REST 路由与手动校验路由 |
| `server/controllers/opportunityController.js` | Create | CRUD 与校验控制器 |
| `server/services/biddingSiteService.js` | Create | 招标网站业务服务，封装查询、保存、删除 |
| `server/services/biddingSiteValidationService.js` | Create | URL 探测 + AI 判断的组合服务 |
| `server/models/biddingSiteModel.js` | Create | 招标网站表的 SQLite 数据访问 |
| `server/init-db.js` | Modify | 新环境初始化时创建招标网站表 |
| `server/migrations/005_create_bidding_sites.js` | Create | 存量数据库补表 migration |
| `server/seed-data/seed-bidding-sites.js` | Create | 将文档中的招标网站作为默认数据写入数据库 |
| `server/seed-data/seed-all.js` | Modify | 接入新的招标网站 seed 脚本 |
| `server/tests/biddingSitesAPI.test.js` | Create | 招标网站 CRUD 与校验接口集成测试 |
| `server/tests/biddingSiteValidationService.test.js` | Create | URL 探测 / 规则判断 / AI 结果归并测试 |

### Technical Decisions

- 菜单层级采用一级菜单 `项目机会`，首个子菜单为 `招标网站`
- API 命名按领域划分，暂定为 `/api/opportunity/bidding-sites`，手动校验暂定为 `POST /api/opportunity/bidding-sites/:id/validate`
- 前端模块按 clean slate 新建，不挂到 `参数配置`，为后续“项目机会”其他子菜单留空间
- 后端实现模式采用 `route -> controller -> service -> model`，参考 Web3D，而不是沿用旧 `config` 直连模型写法
- 需要同时修改 `server/init-db.js` 和新增 migration 脚本：
  - `init-db.js` 负责新环境一键建库
  - migration 负责已有环境补表
- 招标网站数据表暂定为 `opportunity_bidding_sites`，推荐字段如下：
  - `id`, `name`, `alias_name`, `url`, `normalized_url`, `source_level`, `province`, `city`, `platform_type`, `is_official`, `enabled`, `notes`
  - `validation_status`, `validation_summary`, `auth_required`, `is_bidding_site`, `http_status`, `final_url`, `redirect_chain_json`, `validation_confidence`, `validation_payload_json`, `last_validated_at`
  - `created_at`, `updated_at`
  - `normalized_url` 建唯一索引，另外为 `source_level`、`platform_type`、`enabled`、`validation_status` 建普通索引
- `validation_status` 明确定义为五态枚举：`never_validated`、`validated_ok`、`validated_warning`、`validated_failed`、`heuristic_only`
- `auth_required` 与 `is_bidding_site` 使用三态：`true | false | null`；`null` 表示本次校验无法可靠判断
- 首版数据来源按“前文清单 + 最终汇总表”组合确定
- 汇总入口链接（如地方入口、媒体矩阵）不入库
- 抓取方案、工具说明、代码示例中的演示链接不入库
- 最终汇总表是主数据源；若同一 URL 在前文和表格中重复，优先采用表格名称与结构化字段，前文名称写入 `alias_name`
- 若某站点只出现在前文清单，则按所在章节推导 `source_level`，并人工判断 `platform_type`；无法确定的 `province/city` 留空
- 初始化导入不应在运行时解析 Markdown。更稳的实现是人工整理出一个去重后的 JS 数组，写入 `seed-bidding-sites.js`；当前文档中可提取约 `98` 个唯一 URL，量级适合人工整理
- 第三方综合平台作为正式站点入库，`source_level` 标记为 `第三方综合`，`platform_type` 标记为 `聚合平台`
- AI 校验采用“手动触发”，不在新增/编辑保存时自动执行
- 校验链路优先采用“后端基础探测 + AI 归纳判断”的双阶段方案：
  - 第 1 阶段：后端对目标 URL 做格式校验、可访问性检查、跳转跟踪和页面特征提取
  - 第 2 阶段：将探测结果和页面摘要交给 AI，输出业务判断结果
- 因为后端 `package.json` 中没有通用 HTTP 客户端依赖，且项目前置环境为 Node 16+，首版网络探测默认采用 Node 原生 `http/https` 请求模式，显式处理超时、重定向和响应体截断，避免直接依赖全局 `fetch`
- 为避免历史 migration 中 `prompt_templates.category` CHECK 约束和 `init-db.js` 现状不一致，MVP 不新增 prompt category，也不改提示词管理 UI；网站校验提示词直接内置在 `server/services/biddingSiteValidationService.js`
- 校验服务在 AI 模型未配置或 AI 调用失败时，不中断基础网络探测；返回并持久化 `heuristic_only` 结果，确保“手动校验”按钮始终有可用输出
- URL 保存与校验前都要做标准化，但保存时要求用户显式提供 `http://` 或 `https://`，不自动补协议头
- URL 白名单只允许 `http` / `https`；拒绝 `javascript:`、`data:`、`file:`、`ftp:` 与其他自定义 scheme
- `normalized_url` 使用以下规则生成：
  - 主机名统一转小写
  - 去掉 `#fragment`
  - 去掉默认端口 `:80` / `:443`
  - 保留全部 query 参数
  - 保留原始尾斜杠
  - `www` 不与非 `www` 强制合并
  - `http` 与 `https` 不视为同站
- `validated_ok`：可访问、无明显认证阻断、`is_bidding_site = true`
- `validated_warning`：可访问但需要认证，或可访问但不像典型招标站，或置信度偏低，或跳转链异常复杂
- `validated_failed`：URL 非法、连接失败、超时、响应明确失败，或连基础启发式结果都无法产出
- `heuristic_only`：网络探测成功，但 AI 模型不可用或 AI 调用失败，仅保存启发式结果
- 页面只做一个列表页，不新增独立详情路由；新增/编辑通过 Modal 表单完成，校验结果在列表列、Tooltip 或只读弹窗中展示
- 新模块的接口返回应显式采用 `{ success, data, error? }`，避免继续扩散旧接口的不一致格式
- 模块命名应围绕“招标网站”而非“爬虫/抓取”，避免首版范围失控

## Implementation Plan

### Tasks

- [ ] Task 1: 创建招标网站持久化表结构与迁移
  - File: `server/init-db.js`
  - Action: 为新环境补充 `opportunity_bidding_sites` 表和相关索引的建表 SQL。
  - Notes: 表结构必须包含基础站点字段、`alias_name`、最近一次校验结果字段、时间戳字段；`normalized_url` 必须唯一。
  - Notes: `validation_status` 必须按五态枚举落库；`auth_required` / `is_bidding_site` 必须支持三态。
  - File: `server/migrations/005_create_bidding_sites.js`
  - Action: 为已有数据库创建幂等 migration，补齐 `opportunity_bidding_sites` 表与索引。
  - Notes: migration 不能破坏现有业务表，也不能依赖先清空数据库。

- [ ] Task 2: 编写首版默认站点 seed 并接入一键初始化
  - File: `server/seed-data/seed-bidding-sites.js`
  - Action: 将 `docs/招标发布网站 .md` 中的站点手工整理为去重数组，写入数据库。
  - Notes: 数据源采用“前文清单 + 最终汇总表”，但汇总入口、工具说明、代码示例链接不入库。
  - Notes: 至少要覆盖文档中的国家级、地方省市、行业垂直、第三方综合四类站点；导入逻辑需基于 `normalized_url` 幂等，不能因为重复运行产生重复数据。
  - Notes: 若表格与前文冲突，以表格字段为准，前文别名写入 `alias_name`；只在前文出现的站点按章节推导 `source_level/platform_type`，缺失字段留空。
  - File: `server/seed-data/seed-all.js`
  - Action: 将 `seed-bidding-sites.js` 纳入基础数据初始化流程。
  - Notes: 不要清空用户后续新增的自定义站点。

- [ ] Task 3: 实现招标网站后端 CRUD 主链路
  - File: `server/models/biddingSiteModel.js`
  - Action: 实现列表查询、详情查询、创建、更新、删除、校验结果回写等数据访问函数。
  - Notes: 列表查询至少支持 `keyword`、`source_level`、`platform_type`、`is_official`、`enabled`、`validation_status` 过滤；全部查询必须使用参数化 SQL。
  - File: `server/services/biddingSiteService.js`
  - Action: 实现 URL 标准化、参数校验、重复 URL 检查、数据转换和模型调用封装。
  - Notes: 统一在 service 层校验 scheme 白名单、生成 `normalized_url`、设置默认字段，避免 controller 和 model 重复逻辑。
  - Notes: 保存时要求用户显式提供 `http://` 或 `https://`；不自动补协议头。
  - Notes: `normalized_url` 必须严格按已确认规则生成：主机名小写、去 fragment、去默认端口、保留 query、保留尾斜杠、不合并 `www`、不合并 `http/https`。
  - File: `server/controllers/opportunityController.js`
  - Action: 提供 CRUD controller，统一输出 `{ success, data, error? }`。
  - Notes: 删除和更新都要对不存在记录返回明确错误。
  - File: `server/routes/opportunity.js`
  - Action: 挂载 `GET /bidding-sites`、`GET /bidding-sites/:id`、`POST /bidding-sites`、`PUT /bidding-sites/:id`、`DELETE /bidding-sites/:id`。
  - Notes: 路由命名保持 REST 风格，与 Web3D 模块一致。
  - File: `server/routes/index.js`
  - Action: 将 `opportunity` 路由挂到 `/api/opportunity`。
  - Notes: 不要修改现有业务路由前缀。

- [ ] Task 4: 实现网站校验服务和校验接口
  - File: `server/services/biddingSiteValidationService.js`
  - Action: 实现“网络探测 + AI 归纳”的组合校验服务。
  - Notes: 网络探测至少要包含 URL 合法性检查、scheme 白名单校验、超时控制、最多 5 次重定向跟踪、响应状态码、最终 URL、页面标题提取、正文片段提取、登录/身份认证特征识别；正文读取上限建议 64KB 以内。
  - Notes: 响应处理必须支持 `gzip` / `deflate` / `br` 解压，并结合现有 `chardet` / `iconv-lite` 处理非 UTF-8 页面编码（至少覆盖 GBK / GB2312 / GB18030）。
  - Notes: 登录/身份认证 heuristics 至少覆盖 `401/403`、`/login`/`signin`/`sso` 路径、密码输入框、`登录`/`统一身份认证`/`单点登录` 等关键词。
  - Notes: AI 提示词直接内置在该服务中，复用当前 AI model config、providerSelector、aiAssessmentLogModel、aiFileLogger；若 AI 不可用，则返回 `heuristic_only` 结果而不是整条失败。
  - File: `server/services/biddingSiteService.js`
  - Action: 增加“按 id 执行校验并保存结果”的业务方法。
  - Notes: 保存字段至少包括 `validation_status`、`validation_summary`、`auth_required`、`is_bidding_site`、`http_status`、`final_url`、`redirect_chain_json`、`validation_confidence`、`validation_payload_json`、`last_validated_at`。
  - Notes: `validation_status` 与布尔三态必须严格按已确认规则落库，不能把“无法判断”写成 `false`。
  - File: `server/controllers/opportunityController.js`
  - Action: 新增 `validateBiddingSite` controller。
  - Notes: 成功时返回最新校验结果和更新后的站点信息。
  - File: `server/routes/opportunity.js`
  - Action: 增加 `POST /bidding-sites/:id/validate`。
  - Notes: 路由只按站点 id 触发，不做未保存 URL 的临时校验接口。

- [ ] Task 5: 编写后端测试，锁住 CRUD 与校验行为
  - File: `server/tests/biddingSitesAPI.test.js`
  - Action: 为 CRUD 接口和校验接口编写集成测试。
  - Notes: 使用临时 sqlite 数据库；覆盖创建、更新、删除、列表过滤、重复 URL 拒绝、非法 scheme 拒绝、缺少协议头拒绝、手动触发校验、AI 不可用 fallback 等场景。
  - File: `server/tests/biddingSiteValidationService.test.js`
  - Action: 为 URL 标准化、重定向跟踪、登录识别 heuristics、摘要生成逻辑编写单元测试。
  - Notes: 所有网络请求和 AI 调用都要 mock，不能访问真实外网。
  - Notes: 必须覆盖 host 小写、fragment 去除、默认端口去除、query 保留、尾斜杠保留、`www` 不合并、`http/https` 不合并，以及压缩响应和 GBK 页面解码场景。

- [ ] Task 6: 实现前端招标网站 service 与类型定义
  - File: `frontend/ppa_frontend/src/services/opportunity/typings.d.ts`
  - Action: 定义站点实体、列表响应、创建更新参数、校验结果结构等类型。
  - Notes: 类型至少覆盖 `alias_name`、`validation_status` 五态枚举、`validation_summary`、`auth_required` / `is_bidding_site` 三态、`http_status`、`final_url`、`last_validated_at`。
  - File: `frontend/ppa_frontend/src/services/opportunity/index.ts`
  - Action: 封装列表、详情、创建、更新、删除、手动校验接口请求。
  - Notes: 前端 service 统一使用 `@umijs/max` 的 `request`；接口返回结构按 `{ success, data }` 读取。

- [ ] Task 7: 实现前端菜单和招标网站列表页
  - File: `frontend/ppa_frontend/.umirc.ts`
  - Action: 新增一级菜单 `项目机会`，并在其下配置 `招标网站` 子菜单路由。
  - Notes: 保持现有菜单顺序和 Umi 路由风格，预留该一级菜单后续扩展其他子菜单。
  - File: `frontend/ppa_frontend/src/pages/Opportunity/BiddingSites.tsx`
  - Action: 实现招标网站列表页，包含查询筛选、表格展示、创建/编辑 Modal、删除确认、访问网址、AI 校验。
  - Notes: 页面建议使用 `ProTable`；至少展示名称、网址、层级、地区、平台类型、官方属性、启用状态、校验状态、是否需要认证、最后校验时间、摘要。
  - Notes: “访问网址”应使用 `window.open(record.final_url || record.url, '_blank', 'noopener,noreferrer')`；“AI 校验”执行后需刷新当前行或整表并给出消息反馈。
  - Notes: 新增/编辑表单至少包含 `name`、`url`、`source_level`、`province`、`city`、`platform_type`、`is_official`、`enabled`、`notes`；`url` 必须前端校验为显式 `http://` 或 `https://`。

### Acceptance Criteria

- [ ] AC 1: Given 系统已完成数据库初始化和 seed，when 用户打开 `/opportunity/bidding-sites`，then 菜单中可见一级菜单 `项目机会` 和子菜单 `招标网站`，且页面能加载默认站点列表。
- [ ] AC 2: Given 数据库已导入默认站点，when 用户重新执行 `server/seed-data/seed-bidding-sites.js` 或 `server/seed-data/seed-all.js`，then 不会生成重复站点记录。
- [ ] AC 3: Given 用户在新增或编辑表单中输入未显式带 `http://` 或 `https://` 的 URL，when 提交站点，then 前端会直接拦截或后端明确拒绝保存该地址。
- [ ] AC 4: Given 数据库中已存在某站点 URL，when 用户再创建一个仅在主机名大小写、`#fragment` 或默认端口上不同的地址，then 接口按同一 `normalized_url` 处理并返回明确的重复错误。
- [ ] AC 5: Given 数据库中已存在某站点 URL，when 用户再创建一个仅在 query、尾斜杠、`www` 前缀或 `http/https` 协议上不同的地址，then 系统将其视为不同记录并允许保存。
- [ ] AC 6: Given 用户在列表页执行新增、编辑或删除，when 操作成功，then 页面会刷新并展示最新数据，且不会影响其他站点记录。
- [ ] AC 7: Given 列表中存在一个通过白名单校验保存下来的站点，when 用户点击 `访问网址`，then 浏览器会以新标签页打开 `final_url` 或原始 `url`，且系统不会拼接或容错补全协议头。
- [ ] AC 8: Given 某站点 URL 可访问且页面存在招标/采购相关特征，when 用户点击 `AI 校验`，then 系统会保存并返回 `validation_status`、`validation_summary`、`is_bidding_site`、`auth_required`、`http_status`、`final_url`、`last_validated_at` 等最新结果，且 `validation_status = validated_ok`。
- [ ] AC 9: Given 某站点响应中包含登录页路径、密码输入框或统一认证关键词，when 用户触发校验，then 结果中的 `auth_required = true`，且 `validation_status` 至少为 `validated_warning`，并在摘要中体现需要登录或身份认证的判断依据。
- [ ] AC 10: Given 当前没有可用 AI 模型配置或 AI 调用失败，when 用户触发校验，then 系统仍会完成基础网络探测并返回 `heuristic_only` 结果，而不是整条请求直接失败。
- [ ] AC 11: Given 用户输入的 URL 非法、域名不可达或请求超时，when 用户触发校验，then 系统会将该次校验标记为 `validated_failed` 并返回可读错误信息，且不会导致服务崩溃。
- [ ] AC 12: Given 目标站点返回压缩内容或非 UTF-8 编码页面，when 用户触发校验，then 系统仍能正确解压和解码，并提取标题或正文片段用于启发式判断与 AI 输入。
- [ ] AC 13: Given 用户在列表页使用关键词、层级、平台类型、官方属性、启用状态或校验状态筛选，when 发起查询，then 接口和页面返回的站点集合与过滤条件一致。
- [ ] AC 14: Given 后端测试运行在临时 sqlite 数据库上，when 执行新增测试套件，then CRUD、规范化去重、非法 scheme 拒绝、手动校验、heuristic fallback、压缩/编码解析等核心场景均能被自动化验证。

## Additional Context

### Dependencies

- 不要求新增前端或后端第三方依赖；MVP 直接复用现有 `@umijs/max`、Ant Design/ProComponents、Express、SQLite3
- 网络探测依赖 Node 原生 `http`、`https`、`url`、`zlib` 模块
- 页面编码识别复用现有后端依赖 `chardet` 与 `iconv-lite`
- AI 归纳依赖现有 AI model config、providerSelector、openai-compatible provider、aiAssessmentLogModel、aiFileLogger
- 默认站点数据依赖 [docs/招标发布网站 .md](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/招标发布网站%20.md) 的人工整理结果
- 若后续决定把网站校验提示词外置到管理后台，需要另开一个小改动处理 `prompt_templates` 分类约束兼容问题；不属于本次 MVP

### Testing Strategy

- 后端单元测试：
  - 覆盖 URL 标准化、去重键生成、scheme 白名单、重定向链解析、标题提取、认证特征识别、摘要拼装
  - 所有网络请求通过 mock/stub 驱动，不访问真实互联网
- 后端集成测试：
  - 使用临时 sqlite 数据库和 `supertest`
  - 覆盖站点 CRUD、过滤查询、重复 URL 拒绝、删除不存在记录、手动校验成功、AI fallback、非法 URL/超时失败
  - 覆盖 host 小写、fragment 去除、默认端口去除、query 保留、尾斜杠保留、`www` 不合并、`http/https` 不合并
  - 覆盖压缩响应与非 UTF-8 页面解码
- 前端手工验证：
  - 运行 seed 后检查菜单和默认站点展示
  - 验证新增/编辑/删除、筛选、访问网址、手动校验交互
  - 验证 URL 输入必须显式带 `http://` 或 `https://`
  - 验证校验成功、校验失败、heuristic_only 三种状态在 UI 中的展示
- 回归关注点：
  - `.umirc.ts` 菜单改动不能影响现有 `dashboard`、`assessment`、`web3d`、`model-config` 路由
  - `seed-all.js` 新增脚本后不能破坏现有角色、差旅、Web3D 初始化流程

### Notes

- 该模块是“项目机会”菜单下的第一个子模块，数据模型和路由命名需要考虑后续扩展其他机会来源
- 已确认不存在 `project-context.md`
- 已确认当前代码库中没有现成的“招标网站”领域实现，可按新模块独立建设
- 高风险点 1：`prompt_templates` 的历史 migration 和 `init-db.js` 当前定义不一致，因此本次明确不在 MVP 引入新的提示词分类
- 高风险点 2：部分招标站点会强制跳转、阻止 `HEAD`、编码不规范或首屏很大，网络探测必须限制超时、跳转次数和响应体大小
- 高风险点 3：种子数据源是 Markdown 文档，存在叙述段落、重复链接和格式噪音，必须先人工整理再写 seed
- 已知限制：首版只验证“网址和站点特征”，不做公告抓取、账号登录、验证码处理、可用性监控
- 后续可扩展项：把网站校验提示词外置到模型配置、增加批量导入、增加抓取配置、增加“项目机会”下的其他来源子模块
