# API Inventory

> 由 `npm run build:api` 从代码派生自动生成，请勿手工编辑。共 175 个接口。


## AI

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/api/ai/analyze-project-modules` | 项目模块拆解分析 |
| POST | `/api/ai/assess-risk` | AI 风险评估评分 |
| POST | `/api/ai/evaluate-workload` | 按角色估算工作量 |
| POST | `/api/ai/generate-project-tags` | 生成项目标签 |
| GET | `/api/ai/module-prompts` | 模块梳理提示词列表 |
| POST | `/api/ai/normalize-risk-names` | 风险名称对齐到允许列表 |
| GET | `/api/ai/project-tag-prompts` | 项目标签提示词列表 |
| GET | `/api/ai/prompts` | 风险分析提示词列表 |
| GET | `/api/ai/workload-prompts` | 工作量评估提示词列表 |

## Calculation

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/api/calculate` | 实时计算项目成本（核心报价引擎） |

## Config

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/config/ai-models` | 获取 AI 模型配置列表 |
| POST | `/api/config/ai-models` | 创建 AI 模型配置 |
| DELETE | `/api/config/ai-models/{id}` | 删除 AI 模型配置 |
| GET | `/api/config/ai-models/{id}` | 获取单个 AI 模型配置 |
| PUT | `/api/config/ai-models/{id}` | 更新 AI 模型配置 |
| POST | `/api/config/ai-models/{id}/set-current` | 设置当前使用的 AI 模型 |
| POST | `/api/config/ai-models/{id}/set-current-vision` | 设置当前视觉 AI 模型 |
| POST | `/api/config/ai-models/{id}/test` | 测试已保存的 AI 模型连通性 |
| GET | `/api/config/ai-models/current` | 获取当前使用的 AI 模型 |
| GET | `/api/config/ai-models/current-vision` | 获取当前视觉 AI 模型 |
| POST | `/api/config/ai-models/test-temp` | 测试临时 AI 模型配置（不保存） |
| GET | `/api/config/all` | 获取聚合配置（角色/风险项/差旅成本/商务报价） |
| GET | `/api/config/business-pricing` | 获取商务报价配置 |
| PUT | `/api/config/business-pricing` | 更新商务报价配置 |
| GET | `/api/config/prompt-module-tags` | 获取提示词模块标签列表 |
| POST | `/api/config/prompt-module-tags` | 创建提示词模块标签 |
| DELETE | `/api/config/prompt-module-tags/{id}` | 删除提示词模块标签 |
| PUT | `/api/config/prompt-module-tags/{id}` | 更新提示词模块标签 |
| GET | `/api/config/prompts` | 获取提示词模板列表 |
| POST | `/api/config/prompts` | 创建提示词模板 |
| DELETE | `/api/config/prompts/{id}` | 删除提示词模板 |
| GET | `/api/config/prompts/{id}` | 获取单个提示词模板 |
| PUT | `/api/config/prompts/{id}` | 更新提示词模板 |
| POST | `/api/config/prompts/{id}/copy` | 复制提示词模板 |
| POST | `/api/config/prompts/{id}/preview` | 预览渲染后的提示词 |
| GET | `/api/config/risk-items` | 获取风险评估项列表 |
| POST | `/api/config/risk-items` | 创建风险评估项 |
| DELETE | `/api/config/risk-items/{id}` | 删除风险评估项 |
| PUT | `/api/config/risk-items/{id}` | 更新风险评估项 |
| GET | `/api/config/roles` | 获取角色列表 |
| POST | `/api/config/roles` | 创建角色 |
| DELETE | `/api/config/roles/{id}` | 删除角色 |
| PUT | `/api/config/roles/{id}` | 更新角色 |
| GET | `/api/config/travel-costs` | 获取差旅成本列表 |
| POST | `/api/config/travel-costs` | 创建差旅成本 |
| DELETE | `/api/config/travel-costs/{id}` | 删除差旅成本 |
| PUT | `/api/config/travel-costs/{id}` | 更新差旅成本 |

## Contracts

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/contracts/file` | 读取单个合同数据文件（支持搜索与行数限制） |
| GET | `/api/contracts/files` | 列出可用的合同数据文件 |
| POST | `/api/contracts/recommend` | 基于标签推荐相关合同 |

## Dashboard

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/dashboard/cost-range` | 成本区间分布 |
| GET | `/api/dashboard/dna` | 项目 DNA 雷达图数据 |
| GET | `/api/dashboard/keywords` | 词云数据 |
| GET | `/api/dashboard/overview` | Header 概览指标 |
| GET | `/api/dashboard/top-risks` | Top 风险统计 |
| GET | `/api/dashboard/top-role` | Top 角色统计（别名） |
| GET | `/api/dashboard/top-roles` | Top 角色统计 |
| GET | `/api/dashboard/trend` | 月度趋势数据 |

## DataMetrics

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/data-metrics` | 获取指标列表（分页） |
| POST | `/api/data-metrics` | 新增指标 |
| DELETE | `/api/data-metrics/{id}` | 删除指标 |
| GET | `/api/data-metrics/{id}` | 获取单个指标 |
| PUT | `/api/data-metrics/{id}` | 更新指标 |
| POST | `/api/data-metrics/batch` | 批量删除/更新指标 |
| POST | `/api/data-metrics/categories` | 新增场景分类 |
| DELETE | `/api/data-metrics/categories/{id}` | 删除场景分类 |
| PUT | `/api/data-metrics/categories/{id}` | 更新场景分类 |
| GET | `/api/data-metrics/categories/tree` | 获取场景分类树 |
| GET | `/api/data-metrics/export` | 导出指标为 Excel |
| GET | `/api/data-metrics/filter-options` | 获取筛选选项 |
| POST | `/api/data-metrics/import` | 确认导入 |
| POST | `/api/data-metrics/import/preview` | 导入预览（multipart/form-data，字段名 file，.xlsx） |
| GET | `/api/data-metrics/linked-projects` | 获取可关联的历史项目 |
| GET | `/api/data-metrics/projects` | 获取数据指标设计项目列表 |
| POST | `/api/data-metrics/projects` | 创建数据指标设计项目 |
| DELETE | `/api/data-metrics/projects/{id}` | 删除数据指标设计项目 |
| GET | `/api/data-metrics/projects/{id}` | 获取单个数据指标设计项目 |
| PUT | `/api/data-metrics/projects/{id}` | 更新数据指标设计项目 |
| GET | `/api/data-metrics/projects/{id}/agent-context` | Agent 绘制大纲（需 X-Agent-API-Key；format=markdown 时返回 text/markdown） |
| POST | `/api/data-metrics/projects/{id}/agent-feedback` | Agent 回写排版布局与 3D 关联参数（需 X-Agent-API-Key） |
| GET | `/api/data-metrics/projects/{id}/agent-layout` | Agent 12 栅格 Canvas 坐标 DSL（需 X-Agent-API-Key） |
| POST | `/api/data-metrics/projects/{id}/convert-to-ppa-template` | 一键转化为 PPA 成本估算模板（需 X-Agent-API-Key） |
| GET | `/api/data-metrics/projects/{id}/export/json` | 导出完整平铺指标 JSON（需 X-Agent-API-Key） |
| GET | `/api/data-metrics/stats` | 获取数据指标统计 |

## FormDesign

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/api/form-design/apps` | 创建应用 |
| GET | `/api/form-design/apps/{appId}/forms` | 获取应用下的表单列表 |
| DELETE | `/api/form-design/apps/{id}` | 删除应用 |
| PUT | `/api/form-design/apps/{id}` | 更新应用 |
| POST | `/api/form-design/fields` | 创建字段 |
| DELETE | `/api/form-design/fields/{id}` | 删除字段 |
| PUT | `/api/form-design/fields/{id}` | 更新字段 |
| POST | `/api/form-design/fields/batch` | 批量更新字段（最多 200 条） |
| POST | `/api/form-design/forms` | 创建表单 |
| GET | `/api/form-design/forms/{formId}/fields` | 获取表单下的字段列表 |
| DELETE | `/api/form-design/forms/{id}` | 删除表单 |
| PUT | `/api/form-design/forms/{id}` | 更新表单 |
| GET | `/api/form-design/projects` | 获取设计项目列表 |
| POST | `/api/form-design/projects` | 创建设计项目 |
| DELETE | `/api/form-design/projects/{id}` | 删除设计项目 |
| GET | `/api/form-design/projects/{id}` | 获取单个设计项目 |
| PUT | `/api/form-design/projects/{id}` | 更新设计项目 |
| GET | `/api/form-design/projects/{projectId}/apps` | 获取项目下的应用列表 |
| GET | `/api/form-design/stats` | 获取表单设计统计 |
| POST | `/api/form-design/validate/field` | 校验单个字段定义 |
| GET | `/api/form-design/validate/form/{formId}` | 校验整张表单 |

## Health

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/health` | 健康检查：返回服务与数据库连接状态 |

## Monitoring

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/monitoring/logs` | AI 调用日志列表（支持过滤/分页查询） |
| GET | `/api/monitoring/logs/{requestHash}` | 单条 AI 调用日志详情 |
| GET | `/api/monitoring/stats` | AI 调用统计聚合 |

## Opportunity

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/opportunity/bidding-sites` | 获取招标网站列表 |
| POST | `/api/opportunity/bidding-sites` | 创建招标网站 |
| DELETE | `/api/opportunity/bidding-sites/{id}` | 删除招标网站 |
| GET | `/api/opportunity/bidding-sites/{id}` | 获取单个招标网站 |
| PUT | `/api/opportunity/bidding-sites/{id}` | 更新招标网站 |
| POST | `/api/opportunity/bidding-sites/{id}/script` | 上传招标网站爬虫脚本（text/plain Python 源码） |
| POST | `/api/opportunity/bidding-sites/{id}/validate` | 校验招标网站爬虫脚本 |
| GET | `/api/opportunity/tender-staging` | 获取招标暂存列表 |
| POST | `/api/opportunity/tender-staging/{id}/parse-fields` | 解析招标字段 |
| POST | `/api/opportunity/tender-staging/{id}/push` | 推送招标暂存项目 |
| GET | `/api/opportunity/tender-staging/{id}/web-search` | 获取招标项目联网检索上下文 |
| POST | `/api/opportunity/tender-staging/{id}/web-search` | 执行招标项目联网检索 |
| POST | `/api/opportunity/tender-staging/archive-source-files` | 归档招标源文件 |
| POST | `/api/opportunity/tender-staging/dedupe/execute` | 执行招标暂存去重 |
| POST | `/api/opportunity/tender-staging/dedupe/preview` | 招标暂存去重预览 |
| POST | `/api/opportunity/tender-staging/sync` | 同步招标暂存数据 |

## Projects

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/projects` | 获取项目列表（支持筛选与排序） |
| POST | `/api/projects` | 创建项目 |
| DELETE | `/api/projects/{id}` | 删除项目 |
| GET | `/api/projects/{id}` | 获取单个项目 |
| PUT | `/api/projects/{id}` | 更新项目 |
| GET | `/api/projects/{id}/attachments` | 列出项目附件 |
| DELETE | `/api/projects/{id}/attachments/{filename}` | 删除项目附件 |
| GET | `/api/projects/{id}/attachments/check` | 检查项目是否有附件 |
| GET | `/api/projects/{id}/attachments/download/{filename}` | 下载项目附件 |
| POST | `/api/projects/{id}/attachments/upload` | 上传项目附件（multipart/form-data, 字段名 file） |
| GET | `/api/projects/{id}/business-quote` | 获取商务报价上下文 |
| POST | `/api/projects/{id}/business-quote` | 保存商务报价快照 |
| GET | `/api/projects/{id}/export/excel` | 导出项目为 Excel |
| GET | `/api/projects/{id}/export/pdf` | 导出项目为 PDF（已废弃） |
| POST | `/api/projects/{id}/push` | 执行项目推送 |
| GET | `/api/projects/{id}/push-history` | 查询项目推送历史 |
| POST | `/api/projects/{id}/push/validate` | 推送前置校验 |
| GET | `/api/projects/templates` | 获取所有模板项目 |

## Templates

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/templates` | 获取项目列表（templates 挂载点） |
| POST | `/api/templates` | 创建项目（templates 挂载点） |
| DELETE | `/api/templates/{id}` | 删除项目（templates 挂载点） |
| GET | `/api/templates/{id}` | 获取单个项目（templates 挂载点） |
| PUT | `/api/templates/{id}` | 更新项目（templates 挂载点） |
| GET | `/api/templates/{id}/business-quote` | 获取商务报价上下文（templates 挂载点） |
| POST | `/api/templates/{id}/business-quote` | 保存商务报价快照（templates 挂载点） |
| GET | `/api/templates/{id}/export/excel` | 导出模板为 Excel |
| GET | `/api/templates/{id}/export/pdf` | 导出模板为 PDF（已废弃） |
| GET | `/api/templates/templates` | 获取所有模板项目（templates 挂载点） |

## Web3D

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/api/web3d/ai/step4-analyze` | Web3D Step4 图像分析（multipart/form-data，支持上传图片） |
| GET | `/api/web3d/ai/step4-prompts` | Web3D Step4 分析提示词列表 |
| GET | `/api/web3d/config/risk-items` | 获取 Web3D 风险项列表 |
| POST | `/api/web3d/config/risk-items` | 创建 Web3D 风险项 |
| DELETE | `/api/web3d/config/risk-items/{id}` | 删除 Web3D 风险项 |
| PUT | `/api/web3d/config/risk-items/{id}` | 更新 Web3D 风险项 |
| GET | `/api/web3d/config/workload-templates` | 获取 Web3D 工作量模板列表 |
| POST | `/api/web3d/config/workload-templates` | 创建 Web3D 工作量模板 |
| DELETE | `/api/web3d/config/workload-templates/{id}` | 删除 Web3D 工作量模板 |
| PUT | `/api/web3d/config/workload-templates/{id}` | 更新 Web3D 工作量模板 |
| GET | `/api/web3d/projects` | 获取 Web3D 项目列表 |
| POST | `/api/web3d/projects` | 创建 Web3D 项目 |
| DELETE | `/api/web3d/projects/{id}` | 删除 Web3D 项目 |
| GET | `/api/web3d/projects/{id}` | 获取单个 Web3D 项目 |
| PUT | `/api/web3d/projects/{id}` | 更新 Web3D 项目 |
| POST | `/api/web3d/projects/{id}/calculate` | Web3D 项目计算 |
| GET | `/api/web3d/projects/{id}/export` | Web3D 项目导出 Excel |
| POST | `/api/web3d/projects/calculate` | Web3D 实时计算（无项目上下文） |

## Wiki

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/api/wiki` | 获取 Wiki 目录树 |
| GET | `/api/wiki/content` | 获取指定 Wiki 文档正文 |
| GET | `/api/wiki/relations` | 获取 Wiki 与项目的绑定关系 |
| POST | `/api/wiki/relations` | 覆盖保存 Wiki 与项目的绑定关系 |
