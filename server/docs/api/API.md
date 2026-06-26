# PPA API文档

> 自动生成于 2026-06-24T10:09:49.101Z

## 概览

- **API总数**: 164
- **标签分类**: 15

## AI集成

### GET /api/prompts

**描述**: GET /prompts

**请求**:
```
GET /api/prompts
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/module-prompts

**描述**: GET /module-prompts

**请求**:
```
GET /api/module-prompts
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/workload-prompts

**描述**: GET /workload-prompts

**请求**:
```
GET /api/workload-prompts
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/project-tag-prompts

**描述**: GET /project-tag-prompts

**请求**:
```
GET /api/project-tag-prompts
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/assess-risk

**描述**: POST /assess-risk

**请求**:
```
POST /api/assess-risk
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/normalize-risk-names

**描述**: POST /normalize-risk-names

**请求**:
```
POST /api/normalize-risk-names
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/analyze-project-modules

**描述**: POST /analyze-project-modules

**请求**:
```
POST /api/analyze-project-modules
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/evaluate-workload

**描述**: POST /evaluate-workload

**请求**:
```
POST /api/evaluate-workload
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/generate-project-tags

**描述**: POST /generate-project-tags

**请求**:
```
POST /api/generate-project-tags
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 附件管理

### POST /api/:id/attachments/upload

**描述**: POST /:id/attachments/upload

**请求**:
```
POST /api/:id/attachments/upload
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id/attachments

**描述**: GET /:id/attachments

**请求**:
```
GET /api/:id/attachments
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id/attachments/download/:filename

**描述**: GET /:id/attachments/download/:filename

**请求**:
```
GET /api/:id/attachments/download/:filename
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/:id/attachments/:filename

**描述**: DELETE /:id/attachments/:filename

**请求**:
```
DELETE /api/:id/attachments/:filename
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id/attachments/check

**描述**: GET /:id/attachments/check

**请求**:
```
GET /api/:id/attachments/check
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 实时计算

### POST /api/

**描述**: POST /

**请求**:
```
POST /api/
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 配置管理

### GET /api/ai-models

**描述**: GET /ai-models

**请求**:
```
GET /api/ai-models
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/ai-models/current

**描述**: GET /ai-models/current

**请求**:
```
GET /api/ai-models/current
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/ai-models/current-vision

**描述**: GET /ai-models/current-vision

**请求**:
```
GET /api/ai-models/current-vision
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/ai-models/:id

**描述**: GET /ai-models/:id

**请求**:
```
GET /api/ai-models/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/ai-models

**描述**: POST /ai-models

**请求**:
```
POST /api/ai-models
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/ai-models/:id

**描述**: PUT /ai-models/:id

**请求**:
```
PUT /api/ai-models/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/ai-models/:id

**描述**: DELETE /ai-models/:id

**请求**:
```
DELETE /api/ai-models/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/ai-models/:id/set-current

**描述**: POST /ai-models/:id/set-current

**请求**:
```
POST /api/ai-models/:id/set-current
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/ai-models/:id/set-current-vision

**描述**: POST /ai-models/:id/set-current-vision

**请求**:
```
POST /api/ai-models/:id/set-current-vision
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/ai-models/:id/test

**描述**: POST /ai-models/:id/test

**请求**:
```
POST /api/ai-models/:id/test
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/ai-models/test-temp

**描述**: POST /ai-models/test-temp

**请求**:
```
POST /api/ai-models/test-temp
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/prompts

**描述**: GET /prompts

**请求**:
```
GET /api/prompts
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/prompts/:id

**描述**: GET /prompts/:id

**请求**:
```
GET /api/prompts/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/prompts

**描述**: POST /prompts

**请求**:
```
POST /api/prompts
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/prompts/:id

**描述**: PUT /prompts/:id

**请求**:
```
PUT /api/prompts/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/prompts/:id

**描述**: DELETE /prompts/:id

**请求**:
```
DELETE /api/prompts/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/prompts/:id/copy

**描述**: POST /prompts/:id/copy

**请求**:
```
POST /api/prompts/:id/copy
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/prompts/:id/preview

**描述**: POST /prompts/:id/preview

**请求**:
```
POST /api/prompts/:id/preview
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/prompt-module-tags

**描述**: GET /prompt-module-tags

**请求**:
```
GET /api/prompt-module-tags
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/prompt-module-tags

**描述**: POST /prompt-module-tags

**请求**:
```
POST /api/prompt-module-tags
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/prompt-module-tags/:id

**描述**: PUT /prompt-module-tags/:id

**请求**:
```
PUT /api/prompt-module-tags/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/prompt-module-tags/:id

**描述**: DELETE /prompt-module-tags/:id

**请求**:
```
DELETE /api/prompt-module-tags/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/roles

**描述**: GET /roles

**请求**:
```
GET /api/roles
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/roles

**描述**: POST /roles

**请求**:
```
POST /api/roles
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/roles/:id

**描述**: PUT /roles/:id

**请求**:
```
PUT /api/roles/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/roles/:id

**描述**: DELETE /roles/:id

**请求**:
```
DELETE /api/roles/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/risk-items

**描述**: GET /risk-items

**请求**:
```
GET /api/risk-items
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/risk-items

**描述**: POST /risk-items

**请求**:
```
POST /api/risk-items
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/risk-items/:id

**描述**: PUT /risk-items/:id

**请求**:
```
PUT /api/risk-items/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/risk-items/:id

**描述**: DELETE /risk-items/:id

**请求**:
```
DELETE /api/risk-items/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/travel-costs

**描述**: GET /travel-costs

**请求**:
```
GET /api/travel-costs
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/travel-costs

**描述**: POST /travel-costs

**请求**:
```
POST /api/travel-costs
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/travel-costs/:id

**描述**: PUT /travel-costs/:id

**请求**:
```
PUT /api/travel-costs/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/travel-costs/:id

**描述**: DELETE /travel-costs/:id

**请求**:
```
DELETE /api/travel-costs/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/business-pricing

**描述**: GET /business-pricing

**请求**:
```
GET /api/business-pricing
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/business-pricing

**描述**: PUT /business-pricing

**请求**:
```
PUT /api/business-pricing
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/all

**描述**: GET /all

**请求**:
```
GET /api/all
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 合同管理

### GET /api/files

**描述**: GET /files

**请求**:
```
GET /api/files
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/file

**描述**: GET /file

**请求**:
```
GET /api/file
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/recommend

**描述**: POST /recommend

**请求**:
```
POST /api/recommend
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 仪表盘

### GET /api/overview

**描述**: GET /overview

**请求**:
```
GET /api/overview
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/trend

**描述**: GET /trend

**请求**:
```
GET /api/trend
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/cost-range

**描述**: GET /cost-range

**请求**:
```
GET /api/cost-range
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/keywords

**描述**: GET /keywords

**请求**:
```
GET /api/keywords
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/dna

**描述**: GET /dna

**请求**:
```
GET /api/dna
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/top-roles

**描述**: GET /top-roles

**请求**:
```
GET /api/top-roles
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/top-risks

**描述**: GET /top-risks

**请求**:
```
GET /api/top-risks
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 数据指标

### GET /api/projects

**描述**: 获取项目列表

**请求**:
```
GET /api/projects
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:id

**描述**: 获取项目详情

**请求**:
```
GET /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/projects

**描述**: 创建项目

**请求**:
```
POST /api/projects
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/projects/:id

**描述**: 更新项目

**请求**:
```
PUT /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/projects/:id

**描述**: 删除项目

**请求**:
```
DELETE /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/stats

**描述**: GET /stats

**请求**:
```
GET /api/stats
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/filter-options

**描述**: GET /filter-options

**请求**:
```
GET /api/filter-options
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/linked-projects

**描述**: GET /linked-projects

**请求**:
```
GET /api/linked-projects
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/

**描述**: GET /

**请求**:
```
GET /api/
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id

**描述**: GET /:id

**请求**:
```
GET /api/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/

**描述**: POST /

**请求**:
```
POST /api/
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/:id

**描述**: PUT /:id

**请求**:
```
PUT /api/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/:id

**描述**: DELETE /:id

**请求**:
```
DELETE /api/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/batch

**描述**: POST /batch

**请求**:
```
POST /api/batch
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/import/preview

**描述**: POST /import/preview

**请求**:
```
POST /api/import/preview
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/import

**描述**: POST /import

**请求**:
```
POST /api/import
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/export

**描述**: GET /export

**请求**:
```
GET /api/export
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/categories/tree

**描述**: GET /categories/tree

**请求**:
```
GET /api/categories/tree
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/categories

**描述**: POST /categories

**请求**:
```
POST /api/categories
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/categories/:id

**描述**: PUT /categories/:id

**请求**:
```
PUT /api/categories/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/categories/:id

**描述**: DELETE /categories/:id

**请求**:
```
DELETE /api/categories/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:id/agent-context

**描述**: GET /projects/:id/agent-context

**请求**:
```
GET /api/projects/:id/agent-context
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:id/agent-layout

**描述**: GET /projects/:id/agent-layout

**请求**:
```
GET /api/projects/:id/agent-layout
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/projects/:id/agent-feedback

**描述**: POST /projects/:id/agent-feedback

**请求**:
```
POST /api/projects/:id/agent-feedback
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/projects/:id/convert-to-ppa-template

**描述**: POST /projects/:id/convert-to-ppa-template

**请求**:
```
POST /api/projects/:id/convert-to-ppa-template
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:id/export/json

**描述**: GET /projects/:id/export/json

**请求**:
```
GET /api/projects/:id/export/json
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 表单设计

### GET /api/stats

**描述**: GET /stats

**请求**:
```
GET /api/stats
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/validate/field

**描述**: POST /validate/field

**请求**:
```
POST /api/validate/field
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/validate/form/:formId

**描述**: GET /validate/form/:formId

**请求**:
```
GET /api/validate/form/:formId
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects

**描述**: 获取项目列表

**请求**:
```
GET /api/projects
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:id

**描述**: 获取项目详情

**请求**:
```
GET /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/projects

**描述**: 创建项目

**请求**:
```
POST /api/projects
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/projects/:id

**描述**: 更新项目

**请求**:
```
PUT /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/projects/:id

**描述**: 删除项目

**请求**:
```
DELETE /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:projectId/apps

**描述**: GET /projects/:projectId/apps

**请求**:
```
GET /api/projects/:projectId/apps
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/apps

**描述**: POST /apps

**请求**:
```
POST /api/apps
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/apps/:id

**描述**: PUT /apps/:id

**请求**:
```
PUT /api/apps/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/apps/:id

**描述**: DELETE /apps/:id

**请求**:
```
DELETE /api/apps/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/apps/:appId/forms

**描述**: GET /apps/:appId/forms

**请求**:
```
GET /api/apps/:appId/forms
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/forms

**描述**: POST /forms

**请求**:
```
POST /api/forms
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/forms/:id

**描述**: PUT /forms/:id

**请求**:
```
PUT /api/forms/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/forms/:id

**描述**: DELETE /forms/:id

**请求**:
```
DELETE /api/forms/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/forms/:formId/fields

**描述**: GET /forms/:formId/fields

**请求**:
```
GET /api/forms/:formId/fields
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/fields

**描述**: POST /fields

**请求**:
```
POST /api/fields
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/fields/:id

**描述**: PUT /fields/:id

**请求**:
```
PUT /api/fields/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/fields/:id

**描述**: DELETE /fields/:id

**请求**:
```
DELETE /api/fields/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/fields/batch

**描述**: POST /fields/batch

**请求**:
```
POST /api/fields/batch
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 健康检查

### GET /api/health

**描述**: 检查系统健康状态

**请求**:
```
GET /api/health
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 监控

### GET /api/logs

**描述**: GET /logs

**请求**:
```
GET /api/logs
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/stats

**描述**: GET /stats

**请求**:
```
GET /api/stats
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/logs/:requestHash

**描述**: GET /logs/:requestHash

**请求**:
```
GET /api/logs/:requestHash
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 商机管理

### GET /api/bidding-sites

**描述**: GET /bidding-sites

**请求**:
```
GET /api/bidding-sites
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/bidding-sites/:id

**描述**: GET /bidding-sites/:id

**请求**:
```
GET /api/bidding-sites/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/bidding-sites

**描述**: POST /bidding-sites

**请求**:
```
POST /api/bidding-sites
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/bidding-sites/:id

**描述**: PUT /bidding-sites/:id

**请求**:
```
PUT /api/bidding-sites/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/bidding-sites/:id

**描述**: DELETE /bidding-sites/:id

**请求**:
```
DELETE /api/bidding-sites/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/bidding-sites/:id/script

**描述**: POST /bidding-sites/:id/script

**请求**:
```
POST /api/bidding-sites/:id/script
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/bidding-sites/:id/validate

**描述**: POST /bidding-sites/:id/validate

**请求**:
```
POST /api/bidding-sites/:id/validate
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/tender-staging

**描述**: GET /tender-staging

**请求**:
```
GET /api/tender-staging
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/tender-staging/dedupe/preview

**描述**: POST /tender-staging/dedupe/preview

**请求**:
```
POST /api/tender-staging/dedupe/preview
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/tender-staging/dedupe/execute

**描述**: POST /tender-staging/dedupe/execute

**请求**:
```
POST /api/tender-staging/dedupe/execute
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/tender-staging/archive-source-files

**描述**: POST /tender-staging/archive-source-files

**请求**:
```
POST /api/tender-staging/archive-source-files
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/tender-staging/:id/parse-fields

**描述**: POST /tender-staging/:id/parse-fields

**请求**:
```
POST /api/tender-staging/:id/parse-fields
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/tender-staging/:id/web-search

**描述**: GET /tender-staging/:id/web-search

**请求**:
```
GET /api/tender-staging/:id/web-search
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/tender-staging/:id/web-search

**描述**: POST /tender-staging/:id/web-search

**请求**:
```
POST /api/tender-staging/:id/web-search
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/tender-staging/sync

**描述**: POST /tender-staging/sync

**请求**:
```
POST /api/tender-staging/sync
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/tender-staging/:id/push

**描述**: POST /tender-staging/:id/push

**请求**:
```
POST /api/tender-staging/:id/push
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 项目管理

### GET /api/templates

**描述**: 获取模板列表

**请求**:
```
GET /api/templates
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id/export/pdf

**描述**: GET /:id/export/pdf

**请求**:
```
GET /api/:id/export/pdf
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id/export/excel

**描述**: GET /:id/export/excel

**请求**:
```
GET /api/:id/export/excel
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id/business-quote

**描述**: GET /:id/business-quote

**请求**:
```
GET /api/:id/business-quote
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/:id/business-quote

**描述**: POST /:id/business-quote

**请求**:
```
POST /api/:id/business-quote
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id

**描述**: GET /:id

**请求**:
```
GET /api/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/

**描述**: GET /

**请求**:
```
GET /api/
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/

**描述**: POST /

**请求**:
```
POST /api/
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/:id

**描述**: PUT /:id

**请求**:
```
PUT /api/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/:id

**描述**: DELETE /:id

**请求**:
```
DELETE /api/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 推送管理

### POST /api/:id/push/validate

**描述**: POST /:id/push/validate

**请求**:
```
POST /api/:id/push/validate
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/:id/push

**描述**: POST /:id/push

**请求**:
```
POST /api/:id/push
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/:id/push-history

**描述**: GET /:id/push-history

**请求**:
```
GET /api/:id/push-history
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## Web3D评估

### GET /api/config/risk-items

**描述**: 获取风险评估项

**请求**:
```
GET /api/config/risk-items
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/config/risk-items

**描述**: 创建风险评估项

**请求**:
```
POST /api/config/risk-items
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/config/risk-items/:id

**描述**: 更新风险评估项

**请求**:
```
PUT /api/config/risk-items/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/config/risk-items/:id

**描述**: 删除风险评估项

**请求**:
```
DELETE /api/config/risk-items/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/config/workload-templates

**描述**: GET /config/workload-templates

**请求**:
```
GET /api/config/workload-templates
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/config/workload-templates

**描述**: POST /config/workload-templates

**请求**:
```
POST /api/config/workload-templates
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/config/workload-templates/:id

**描述**: PUT /config/workload-templates/:id

**请求**:
```
PUT /api/config/workload-templates/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/config/workload-templates/:id

**描述**: DELETE /config/workload-templates/:id

**请求**:
```
DELETE /api/config/workload-templates/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/ai/step4-prompts

**描述**: GET /ai/step4-prompts

**请求**:
```
GET /api/ai/step4-prompts
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/ai/step4-analyze

**描述**: POST /ai/step4-analyze

**请求**:
```
POST /api/ai/step4-analyze
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/projects/calculate

**描述**: POST /projects/calculate

**请求**:
```
POST /api/projects/calculate
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/projects/:id/calculate

**描述**: POST /projects/:id/calculate

**请求**:
```
POST /api/projects/:id/calculate
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:id/export

**描述**: GET /projects/:id/export

**请求**:
```
GET /api/projects/:id/export
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects/:id

**描述**: 获取项目详情

**请求**:
```
GET /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/projects

**描述**: 获取项目列表

**请求**:
```
GET /api/projects
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/projects

**描述**: 创建项目

**请求**:
```
POST /api/projects
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### PUT /api/projects/:id

**描述**: 更新项目

**请求**:
```
PUT /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### DELETE /api/projects/:id

**描述**: 删除项目

**请求**:
```
DELETE /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

## 知识库

### GET /api/

**描述**: GET /

**请求**:
```
GET /api/
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/content

**描述**: GET /content

**请求**:
```
GET /api/content
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### GET /api/relations

**描述**: GET /relations

**请求**:
```
GET /api/relations
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```

### POST /api/relations

**描述**: POST /relations

**请求**:
```
POST /api/relations
```

**响应**:
```json
{
  "success": true,
  "data": {}
}
```
