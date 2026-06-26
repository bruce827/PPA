# PPA 完整 API 接口清单

> 基于 `server/routes/` 目录扫描生成
> 生成时间: 2026-06-24

## 路由结构总览

```
/api
├── /health                      (1)
├── /config
│   ├── /roles                   (4)
│   ├── /risk-items              (4)
│   ├── /travel-costs            (4)
│   ├── /business-pricing        (2)
│   ├── /ai-models               (9)
│   ├── /prompts                 (7)
│   ├── /prompt-module-tags      (4)
│   └── /all                     (1)
├── /calculate                   (1)
├── /projects
│   ├── GET /templates           (1)
│   ├── GET /                    (1)
│   ├── GET /:id                 (1)
│   ├── POST /                   (1)
│   ├── PUT /:id                 (1)
│   ├── DELETE /:id              (1)
│   ├── /:id/export/pdf          (1)
│   ├── /:id/export/excel        (1)
│   ├── /:id/business-quote      (2)
│   ├── /:id/attachments/*       (5)
│   ├── /:id/push/*              (3)
│   └── /:id/push-history        (1)
├── /templates                   (1) [别名路由]
├── /dashboard
│   ├── /overview                (1)
│   ├── /trend                   (1)
│   ├── /cost-range              (1)
│   ├── /keywords                (1)
│   ├── /dna                     (1)
│   ├── /top-roles               (1)
│   └── /top-risks               (1)
├── /ai
│   ├── /prompts                 (1)
│   ├── /module-prompts          (1)
│   ├── /workload-prompts        (1)
│   ├── /project-tag-prompts     (1)
│   ├── /assess-risk             (1)
│   ├── /normalize-risk-names    (1)
│   ├── /analyze-project-modules (1)
│   ├── /evaluate-workload       (1)
│   └── /generate-project-tags   (1)
├── /web3d
│   ├── /config/risk-items       (4)
│   ├── /config/workload-templates (4)
│   ├── /ai/step4-prompts        (1)
│   ├── /ai/step4-analyze        (1)
│   ├── /projects                (5)
│   ├── /projects/calculate      (2)
│   └── /projects/:id/export     (1)
├── /monitoring
│   ├── /logs                    (1)
│   ├── /stats                   (1)
│   └── /logs/:requestHash       (1)
├── /contracts
│   ├── /files                   (1)
│   ├── /file                    (1)
│   └── /recommend               (1)
├── /opportunity
│   ├── /bidding-sites           (6)
│   ├── /tender-staging          (8)
│   ├── /tender-staging/*        (5)
│   └── /tender-staging/sync     (1)
├── /form-design
│   ├── /stats                   (1)
│   ├── /validate/*              (2)
│   ├── /projects                (5)
│   ├── /apps                    (4)
│   ├── /forms                   (4)
│   ├── /fields                  (5)
│   └── /fields/batch             (1)
├── /wiki
│   ├── /                        (1)
│   ├── /content                 (1)
│   ├── /relations               (2)
│   ├── /images/*                (静态文件)
│   └── /validate/*              (2)
└── /data-metrics
    ├── /projects                 (5)
    ├── /stats                    (1)
    ├── /filter-options           (1)
    ├── /linked-projects          (1)
    ├── /                         (5)
    ├── /:id                      (2)
    ├── /batch                    (1)
    ├── /import/*                 (2)
    ├── /export                   (1)
    ├── /categories/*             (5)
    ├── /:id/agent-context        (1)
    ├── /:id/agent-layout         (1)
    ├── /:id/agent-feedback       (1)
    ├── /:id/convert-to-ppa-template (1)
    └── /:id/export/json          (1)
```

**总计: 约 140+ 个 API 接口**

---

## 详细接口清单

### 1. Health Check
- [ ] `GET /api/health` - 健康检查

### 2. Config (配置管理)

#### 2.1 角色配置 (config/roles)
- [ ] `GET /api/config/roles` - 获取角色列表
- [ ] `POST /api/config/roles` - 创建角色
- [ ] `PUT /api/config/roles/:id` - 更新角色
- [ ] `DELETE /api/config/roles/:id` - 删除角色

#### 2.2 风险项配置 (config/risk-items)
- [ ] `GET /api/config/risk-items` - 获取风险项列表
- [ ] `POST /api/config/risk-items` - 创建风险项
- [ ] `PUT /api/config/risk-items/:id` - 更新风险项
- [ ] `DELETE /api/config/risk-items/:id` - 删除风险项

#### 2.3 差旅成本配置 (config/travel-costs)
- [ ] `GET /api/config/travel-costs` - 获取差旅成本列表
- [ ] `POST /api/config/travel-costs` - 创建差旅成本
- [ ] `PUT /api/config/travel-costs/:id` - 更新差旅成本
- [ ] `DELETE /api/config/travel-costs/:id` - 删除差旅成本

#### 2.4 商务报价配置 (config/business-pricing)
- [ ] `GET /api/config/business-pricing` - 获取商务报价配置
- [ ] `PUT /api/config/business-pricing` - 更新商务报价配置

#### 2.5 AI 模型配置 (config/ai-models)
- [ ] `GET /api/config/ai-models` - 获取 AI 模型列表
- [ ] `GET /api/config/ai-models/current` - 获取当前 AI 模型
- [ ] `GET /api/config/ai-models/current-vision` - 获取当前视觉 AI 模型
- [ ] `GET /api/config/ai-models/:id` - 获取 AI 模型详情
- [ ] `POST /api/config/ai-models` - 创建 AI 模型
- [ ] `PUT /api/config/ai-models/:id` - 更新 AI 模型
- [ ] `DELETE /api/config/ai-models/:id` - 删除 AI 模型
- [ ] `POST /api/config/ai-models/:id/set-current` - 设为当前 AI 模型
- [ ] `POST /api/config/ai-models/:id/set-current-vision` - 设为当前视觉模型
- [ ] `POST /api/config/ai-models/:id/test` - 测试 AI 模型连接
- [ ] `POST /api/config/ai-models/test-temp` - 测试临时 AI 连接

#### 2.6 提示词模板 (config/prompts)
- [ ] `GET /api/config/prompts` - 获取提示词模板列表
- [ ] `GET /api/config/prompts/:id` - 获取模板详情
- [ ] `POST /api/config/prompts` - 创建模板
- [ ] `PUT /api/config/prompts/:id` - 更新模板
- [ ] `DELETE /api/config/prompts/:id` - 删除模板
- [ ] `POST /api/config/prompts/:id/copy` - 复制模板
- [ ] `POST /api/config/prompts/:id/preview` - 预览模板

#### 2.7 提示词模块标签 (config/prompt-module-tags)
- [ ] `GET /api/config/prompt-module-tags` - 获取标签列表
- [ ] `POST /api/config/prompt-module-tags` - 创建标签
- [ ] `PUT /api/config/prompt-module-tags/:id` - 更新标签
- [ ] `DELETE /api/config/prompt-module-tags/:id` - 删除标签

#### 2.8 聚合配置 (config/all)
- [ ] `GET /api/config/all` - 获取所有配置聚合

### 3. Calculation (报价计算)
- [ ] `POST /api/calculate` - 执行报价计算

### 4. Projects (项目管理)

#### 4.1 模板
- [ ] `GET /api/projects/templates` - 获取模板列表
- [ ] `GET /api/templates` - 获取模板列表 (别名)

#### 4.2 项目 CRUD
- [ ] `GET /api/projects` - 获取项目列表
- [ ] `GET /api/projects/:id` - 获取项目详情
- [ ] `POST /api/projects` - 创建项目
- [ ] `PUT /api/projects/:id` - 更新项目
- [ ] `DELETE /api/projects/:id` - 删除项目

#### 4.3 导出
- [ ] `GET /api/projects/:id/export/pdf` - 导出 PDF
- [ ] `GET /api/projects/:id/export/excel` - 导出 Excel

#### 4.4 商务报价
- [ ] `GET /api/projects/:id/business-quote` - 获取商务报价
- [ ] `POST /api/projects/:id/business-quote` - 保存商务报价

#### 4.5 附件管理
- [ ] `POST /api/projects/:id/attachments/upload` - 上传附件
- [ ] `GET /api/projects/:id/attachments` - 获取附件列表
- [ ] `GET /api/projects/:id/attachments/download/:filename` - 下载附件
- [ ] `DELETE /api/projects/:id/attachments/:filename` - 删除附件
- [ ] `GET /api/projects/:id/attachments/check` - 检查附件

#### 4.6 推送
- [ ] `POST /api/projects/:id/push/validate` - 验证推送
- [ ] `POST /api/projects/:id/push` - 推送项目
- [ ] `GET /api/projects/:id/push-history` - 获取推送历史

### 5. Dashboard (数据看板)
- [ ] `GET /api/dashboard/overview` - 概览统计
- [ ] `GET /api/dashboard/trend` - 月度趋势
- [ ] `GET /api/dashboard/cost-range` - 成本区间
- [ ] `GET /api/dashboard/keywords` - 词云数据
- [ ] `GET /api/dashboard/dna` - 雷达图数据
- [ ] `GET /api/dashboard/top-roles` - Top 角色
- [ ] `GET /api/dashboard/top-risks` - Top 风险项

### 6. AI (AI 评估)
- [ ] `GET /api/ai/prompts` - 获取提示词
- [ ] `GET /api/ai/module-prompts` - 获取模块提示词
- [ ] `GET /api/ai/workload-prompts` - 获取工作量提示词
- [ ] `GET /api/ai/project-tag-prompts` - 获取项目标签提示词
- [ ] `POST /api/ai/assess-risk` - 风险评估
- [ ] `POST /api/ai/normalize-risk-names` - 风险名称标准化
- [ ] `POST /api/ai/analyze-project-modules` - 项目模块分析
- [ ] `POST /api/ai/evaluate-workload` - 工作量评估
- [ ] `POST /api/ai/generate-project-tags` - 生成项目标签

### 7. Web3D (Web3D 项目)

#### 7.1 风险项配置
- [ ] `GET /api/web3d/config/risk-items` - 获取风险项列表
- [ ] `POST /api/web3d/config/risk-items` - 创建风险项
- [ ] `PUT /api/web3d/config/risk-items/:id` - 更新风险项
- [ ] `DELETE /api/web3d/config/risk-items/:id` - 删除风险项

#### 7.2 工作量模板
- [ ] `GET /api/web3d/config/workload-templates` - 获取模板列表
- [ ] `POST /api/web3d/config/workload-templates` - 创建模板
- [ ] `PUT /api/web3d/config/workload-templates/:id` - 更新模板
- [ ] `DELETE /api/web3d/config/workload-templates/:id` - 删除模板

#### 7.3 AI 分析
- [ ] `GET /api/web3d/ai/step4-prompts` - 获取 Step4 提示词
- [ ] `POST /api/web3d/ai/step4-analyze` - Step4 分析

#### 7.4 项目管理
- [ ] `GET /api/web3d/projects` - 获取项目列表
- [ ] `GET /api/web3d/projects/:id` - 获取项目详情
- [ ] `POST /api/web3d/projects` - 创建项目
- [ ] `PUT /api/web3d/projects/:id` - 更新项目
- [ ] `DELETE /api/web3d/projects/:id` - 删除项目

#### 7.5 计算与导出
- [ ] `POST /api/web3d/projects/calculate` - 批量计算
- [ ] `POST /api/web3d/projects/:id/calculate` - 单个计算
- [ ] `GET /api/web3d/projects/:id/export` - 导出

### 8. Monitoring (监控)
- [ ] `GET /api/monitoring/logs` - 获取日志列表
- [ ] `GET /api/monitoring/stats` - 获取统计信息
- [ ] `GET /api/monitoring/logs/:requestHash` - 获取日志详情

### 9. Contracts (合同管理)
- [ ] `GET /api/contracts/files` - 获取合同文件列表
- [ ] `GET /api/contracts/file` - 读取合同文件
- [ ] `POST /api/contracts/recommend` - 推荐合同条款

### 10. Opportunity (项目机会)

#### 10.1 招标网站 (bidding-sites)
- [ ] `GET /api/opportunity/bidding-sites` - 获取招标网站列表
- [ ] `GET /api/opportunity/bidding-sites/:id` - 获取详情
- [ ] `POST /api/opportunity/bidding-sites` - 创建
- [ ] `PUT /api/opportunity/bidding-sites/:id` - 更新
- [ ] `DELETE /api/opportunity/bidding-sites/:id` - 删除
- [ ] `POST /api/opportunity/bidding-sites/:id/script` - 上传爬虫脚本
- [ ] `POST /api/opportunity/bidding-sites/:id/validate` - 验证爬虫

#### 10.2 招标项目暂存 (tender-staging)
- [ ] `GET /api/opportunity/tender-staging` - 获取列表
- [ ] `POST /api/opportunity/tender-staging/dedupe/preview` - 去重预览
- [ ] `POST /api/opportunity/tender-staging/dedupe/execute` - 执行去重
- [ ] `POST /api/opportunity/tender-staging/archive-source-files` - 归档源文件
- [ ] `POST /api/opportunity/tender-staging/:id/parse-fields` - 解析字段
- [ ] `GET /api/opportunity/tender-staging/:id/web-search` - 获取网络搜索
- [ ] `POST /api/opportunity/tender-staging/:id/web-search` - 执行网络搜索
- [ ] `POST /api/opportunity/tender-staging/sync` - 同步
- [ ] `POST /api/opportunity/tender-staging/:id/push` - 推送

### 11. Form Design (表单设计)

#### 11.1 统计与校验
- [ ] `GET /api/form-design/stats` - 统计信息
- [ ] `POST /api/form-design/validate/field` - 校验字段
- [ ] `GET /api/form-design/validate/form/:formId` - 校验表单

#### 11.2 设计项目 (projects)
- [ ] `GET /api/form-design/projects` - 获取项目列表
- [ ] `GET /api/form-design/projects/:id` - 获取详情
- [ ] `POST /api/form-design/projects` - 创建项目
- [ ] `PUT /api/form-design/projects/:id` - 更新项目
- [ ] `DELETE /api/form-design/projects/:id` - 删除项目

#### 11.3 应用 (apps)
- [ ] `GET /api/form-design/projects/:projectId/apps` - 获取应用列表
- [ ] `POST /api/form-design/apps` - 创建应用
- [ ] `PUT /api/form-design/apps/:id` - 更新应用
- [ ] `DELETE /api/form-design/apps/:id` - 删除应用

#### 11.4 表单 (forms)
- [ ] `GET /api/form-design/apps/:appId/forms` - 获取表单列表
- [ ] `POST /api/form-design/forms` - 创建表单
- [ ] `PUT /api/form-design/forms/:id` - 更新表单
- [ ] `DELETE /api/form-design/forms/:id` - 删除表单

#### 11.5 字段 (fields)
- [ ] `GET /api/form-design/forms/:formId/fields` - 获取字段列表
- [ ] `POST /api/form-design/fields` - 创建字段
- [ ] `PUT /api/form-design/fields/:id` - 更新字段
- [ ] `DELETE /api/form-design/fields/:id` - 删除字段
- [ ] `POST /api/form-design/fields/batch` - 批量更新字段

### 12. Wiki (知识库)
- [ ] `GET /api/wiki/` - 获取 Wiki 目录树
- [ ] `GET /api/wiki/content` - 获取 Wiki 文档内容
- [ ] `GET /api/wiki/relations` - 获取项目关联关系
- [ ] `POST /api/wiki/relations` - 保存项目关联关系
- [ ] `GET /api/wiki/images/*` - 静态文件 (图片/附件)

### 13. Data Metrics (数据指标设计)

#### 13.1 项目管理
- [ ] `GET /api/data-metrics/projects` - 获取项目列表
- [ ] `GET /api/data-metrics/projects/:id` - 获取详情
- [ ] `POST /api/data-metrics/projects` - 创建项目
- [ ] `PUT /api/data-metrics/projects/:id` - 更新项目
- [ ] `DELETE /api/data-metrics/projects/:id` - 删除项目

#### 13.2 统计与筛选
- [ ] `GET /api/data-metrics/stats` - 统计信息
- [ ] `GET /api/data-metrics/filter-options` - 筛选选项
- [ ] `GET /api/data-metrics/linked-projects` - 关联项目

#### 13.3 指标 CRUD
- [ ] `GET /api/data-metrics/` - 获取指标列表
- [ ] `GET /api/data-metrics/:id` - 获取指标详情
- [ ] `POST /api/data-metrics/` - 创建指标
- [ ] `PUT /api/data-metrics/:id` - 更新指标
- [ ] `DELETE /api/data-metrics/:id` - 删除指标
- [ ] `POST /api/data-metrics/batch` - 批量操作

#### 13.4 Excel 导入导出
- [ ] `POST /api/data-metrics/import/preview` - 导入预览
- [ ] `POST /api/data-metrics/import` - 确认导入
- [ ] `GET /api/data-metrics/export` - 导出

#### 13.5 场景分类
- [ ] `GET /api/data-metrics/categories/tree` - 获取分类树
- [ ] `POST /api/data-metrics/categories` - 创建分类
- [ ] `PUT /api/data-metrics/categories/:id` - 更新分类
- [ ] `DELETE /api/data-metrics/categories/:id` - 删除分类

#### 13.6 Agent 接口 (需 X-Agent-API-Key 认证)
- [ ] `GET /api/data-metrics/projects/:id/agent-context` - 获取 Agent 上下文
- [ ] `GET /api/data-metrics/projects/:id/agent-layout` - 获取 Agent 布局
- [ ] `POST /api/data-metrics/projects/:id/agent-feedback` - 回写布局
- [ ] `POST /api/data-metrics/projects/:id/convert-to-ppa-template` - 转化为 PPA 模板
- [ ] `GET /api/data-metrics/projects/:id/export/json` - 导出 JSON

---

## 总计

**140+ 个 API 接口**
- Config 模块: 37 个 (最多)
- Opportunity 模块: 22 个
- Data Metrics 模块: 22 个
- Form Design 模块: 22 个
- Projects 模块: 19 个 (含附件/推送)
- AI 模块: 9 个
- Web3D 模块: 19 个
- Monitoring 模块: 3 个
- Contracts 模块: 3 个
- Wiki 模块: 4 个
- Dashboard 模块: 7 个
- Calculation 模块: 1 个
- Health 模块: 1 个
