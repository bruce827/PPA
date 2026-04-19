# 提示词模板分类 → 模块标签 改造测试清单

## 概述

本次改造将 `prompt_templates.category` 从 CHECK 枚举硬编码改为自由的 `module_tag` 字段，分类不再维护枚举，改为推荐值 + 自由输入。

- 分支：`refactor/prompt-template-category`
- 新标签：`assessment` / `web3d` / `tender` / `bidding_search` / `report` / `general`
- 旧 category 值映射：
  - `risk_analysis` / `workload_evaluation` / `module_analysis` → `assessment`
  - `web3d_step4_analysis` → `web3d`
  - `project_tagging` / `tender_field_parse` → `tender`
  - `web_search` → `bidding_search`
  - `report_generation` → `report`
  - `custom` → `general`

---

## 页面：`/model-config/prompts`（提示词模板列表）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 模块标签列显示 | 进入页面 | 列表"分类"列已改为"模块"，显示新标签中文名（如"评估流程"而非旧英文值） |
| 2 | 模块标签过滤 | 点击"模块"列筛选器 | 下拉显示 6 个推荐模块标签选项（评估流程/3D模块/招标信息/全网招标检索/报告生成/通用） |
| 3 | 按标签筛选 | 选择"3D 模块"过滤 | 只显示 `module_tag=web3d` 的模板（如"Web3D全量评估"） |
| 4 | 按标签筛选（多选） | 勾选多个标签 | 同时显示多个标签下的模板 |
| 5 | 搜索框搜索 | 输入模板名称关键词 | 按名称模糊搜索，结果正确 |
| 6 | 新建按钮 | 点击"新建模板" | 跳转至创建页面 |
| 7 | 复制模板 | 点击复制按钮 | 复制成功，跳转至副本编辑页 |

---

## 页面：`/model-config/prompts/create`（新建模板）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 模块标签选择器 | 展开"模块标签"下拉 | 显示 6 个推荐标签选项 |
| 2 | 模块标签搜索 | 在下拉输入框输入"3d" | 筛选出"3D 模块" |
| 3 | 自定义标签输入 | 输入不存在的标签名（如"inventory"） | 允许输入和保存，自定义标签生效 |
| 4 | auto-sync 触发（assessment） | 选择"评估流程"标签 | 自动触发"从评估类别导入"按钮提示，可点击导入风险变量 |
| 5 | auto-sync 触发（其他标签） | 选择非 assessment 标签 | 不自动触发导入按钮 |
| 6 | 切换标签清除 auto-sync | 先选 assessment 导入变量，再切换到 tender | 清除 assessment 导入的变量 |
| 7 | 保存自定义标签模板 | 输入自定义标签"inventory"，填写其他必填项，保存 | 保存成功，列表显示 module_tag=inventory |
| 8 | system 模板不可编辑 | 查看 is_system=1 的模板 | 模块标签下拉禁用，不可修改 |

---

## 页面：`/model-config/prompts/:id/edit`（编辑模板）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 回显当前模块标签 | 打开一个 assessment 标签的模板 | 表单回显"评估流程（assessment）" |
| 2 | 修改标签保存 | 修改标签为"web3d"，保存 | 成功保存，API 返回 `module_tag: 'web3d'` |
| 3 | 预览功能 | 填写变量后点击"预览" | 变量替换后的提示词内容正确展示 |
| 4 | 系统模板不可修改 | 尝试修改 system 模板的标签 | 字段禁用，无法修改 |

---

## 页面：`/opportunity/tender-push`（招标推送 — 全网检索）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 全网检索加载模板 | 打开全网检索弹窗 | 成功加载 `module_tag=bidding_search` 的模板，下拉有选项 |
| 2 | 全网检索执行 | 选择模板后点击"开始检索" | 正常发起联网搜索（不报 400 错误） |
| 3 | 招标字段解析加载模板 | 打开招标字段解析弹窗 | 成功加载 `module_tag=tender` 的模板，下拉有选项 |
| 4 | 招标字段解析执行 | 选择模板后点击"开始解析" | 正常调用解析接口 |

---

## 页面：`/opportunity/bidding-sites`（招标网站管理）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 页面可正常访问 | 进入招标网站管理页 | 页面正常加载，无模板相关报错 |
| 2 | 关联招标推送功能 | 列表中点击"推送配置"或"全网检索"入口 | 跳转至 tender-push 页面，模板功能正常 |

---

## 页面：`/assessment/new`（标准项目评估 — 评估向导）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 风险评估模板选择（向导内） | 进入 AI 风险评估步骤 | 成功加载 `module_tag=assessment` 的模板列表 |
| 2 | 风险评估 AI 执行（向导内） | 选择模板后点击 AI 评估 | 正常调用 `/api/ai/assess-risk`（不报 400 错误） |
| 3 | 模块分析模板选择（向导内） | 进入模块梳理步骤 | 成功加载 `module_tag=assessment` 的模板列表 |
| 4 | 模块分析 AI 执行（向导内） | 选择模板后点击分析 | 正常调用 `/api/ai/analyze-project-modules` |
| 5 | 工作量评估模板选择（向导内） | 进入工作量评估步骤 | 成功加载 `module_tag=assessment` 的模板列表 |
| 6 | 工作量评估 AI 执行（向导内） | 选择模板后点击评估 | 正常调用 `/api/ai/workload-prompts` 相关接口 |

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 风险评估模板选择（向导内） | 进入 AI 风险评估步骤 | 成功加载 `module_tag=assessment` 的模板列表 |
| 2 | 风险评估 AI 执行（向导内） | 选择模板后点击 AI 评估 | 正常调用 `/api/ai/assess-risk`（不报 400 错误） |
| 3 | 模块分析模板选择（向导内） | 进入模块梳理步骤 | 成功加载 `module_tag=assessment` 的模板列表 |
| 4 | 模块分析 AI 执行（向导内） | 选择模板后点击分析 | 正常调用 `/api/ai/analyze-project-modules` |
| 5 | 工作量评估模板选择（向导内） | 进入工作量评估步骤 | 成功加载 `module_tag=assessment` 的模板列表 |
| 6 | 工作量评估 AI 执行（向导内） | 选择模板后点击评估 | 正常调用 `/api/ai/workload-prompts` 相关接口 |

---

## 页面：`/assessment/detail/:id`（项目详情 — 项目标签）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 项目标签提示词加载 | 进入项目标签生成步骤 | 成功加载 `module_tag=tender` 的模板列表 |
| 2 | 项目标签生成执行 | 选择模板后点击生成 | 正常调用 `/api/ai/generate-project-tags` |

---

## 独立弹窗：`AIAssessmentModal`（AI 只能评估 — 独立入口）

> 该弹窗可在评估向导外独立打开，用于对已有项目文档进行 AI 风险评估，不依赖完整的评估流程。

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 模板加载 | 打开 AI 只能评估弹窗 | 成功加载 `module_tag=assessment` 的模板列表（通过 `/api/ai/prompts`） |
| 2 | 模板切换后变量更新 | 选择不同模板 | 变量表单自动更新为新模板的默认变量 |
| 3 | AI 评估执行 | 填写文档和变量后点击评估 | 正常调用 `/api/ai/assess-risk`，不报 400 错误 |

---

## 页面：`/web3d/new` 或 `/web3d/detail/:id`（Web3D 项目评估 — Step4 AI 分析）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | Web3D Step4 模板加载 | 进入 Web3D Step4 AI 分析步骤 | 成功加载 `module_tag=web3d` 的模板列表 |
| 2 | Web3D Step4 AI 执行 | 选择模板后点击分析 | 正常调用 `/api/web3d/ai/step4-analyze`，不报 400 错误 |

---

## 不受影响的页面（无模板选择功能，确认无回归）

| 页面 | 说明 |
|------|------|
| `/assessment/history` | 历史评估记录列表，无模板选择 |
| `/assessment/contracts` | 合同报价页，无模板选择 |
| `/opportunity/bidding-sites` | 招标网站管理，仅跳转至 tender-push，不直接选模板 |

---

## API 接口测试

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| 1 | `GET /api/config/prompt-module-tags` | 请求接口 | 返回 6 个推荐标签的完整数据（value/label/description） |
| 2 | `GET /api/config/prompts?module_tag=assessment` | 过滤 assessment 模板 | 只返回 assessment 相关模板 |
| 3 | `GET /api/config/prompts?module_tag=assessment*` | 前缀匹配（未来扩展） | 支持以 `*` 结尾的前缀模糊匹配 |
| 4 | `POST /api/config/prompts` | 创建自定义 module_tag 模板 | 成功创建，`module_tag` 可为非推荐值 |
| 5 | `PUT /api/config/prompts/:id` | 修改现有模板的 module_tag | 成功更新 |
| 6 | `POST /api/config/prompts/:id/copy` | 复制模板 | 副本 module_tag 与原模板一致 |
| 7 | `GET /api/ai/module-prompts` | 获取模块梳理提示词 | 返回 `module_tag=assessment` 的模板 |
| 8 | `GET /api/ai/workload-prompts` | 获取工作量评估提示词 | 返回 `module_tag=assessment` 的模板 |
| 9 | `GET /api/ai/project-tag-prompts` | 获取项目标签提示词 | 返回 `module_tag=tender` 的模板 |
| 10 | `GET /api/web3d/ai/step4-prompts` | 获取 Web3D Step4 提示词 | 返回 `module_tag=web3d` 的模板 |

---

## 历史数据迁移验证

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| 1 | DB 中 module_tag 列存在 | 查询 `.schema prompt_templates` | 表列为 `module_tag`，无 CHECK 约束 |
| 2 | 旧数据映射正确 | 查询历史模板的 module_tag | `risk_analysis` → `assessment`，`web3d_step4_analysis` → `web3d`，`project_tagging` → `tender`，`web_search` → `bidding_search`，`custom` → `general` |
| 3 | System Template 保持不变 | 查询 id=1 的模板 | `module_tag: 'assessment'`，`is_system: 1` |
| 4 | 招标相关模板正确合并 | 查询 tender 相关模板 | `project_tagging` 和 `tender_field_parse` 旧值均已合并为 `tender` |

---

## Service 层业务校验（后端）

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| 1 | Web3D Step4 校验新值 | web3dAiStep4Service 调用 | 使用 `module_tag='web3d'` 校验，非 web3d 模板拒绝 |
| 2 | 招标字段解析校验 | tenderFieldParseService 调用 | 使用 `module_tag='tender'` 校验 |
| 3 | 空白 module_tag 拒绝 | 创建模板时不传 module_tag | 后端返回 `module_tag 不能为空` 错误 |

---

## 回归检查（旧功能未破坏）

| # | 测试项 | 操作步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 提示词模板 CRUD | 完整创建→编辑→删除流程 | 各步骤正常 |
| 2 | 变量检测 | 在提示词中写 `{{project_name}}` | 提示"未定义变量"警告，点击"快速添加"可立即添加 |
| 3 | 风险变量导入 | assessment 模板点击"从评估类别导入" | 成功导入风险评估项作为变量 |
| 4 | 角色变量导入 | assessment 模板点击"从角色配置导入" | 成功导入角色配置作为变量 |
| 5 | 模板预览 | 填写变量值后预览 | 正确替换 `{{变量名}}` |

---

## 改动文件清单

### 后端
- `server/utils/promptTemplateCategories.js` — 枚举 → 推荐列表
- `server/migrations/007_expand_prompt_template_categories.js` — 重建表用 module_tag
- `server/migrations/011_expand_prompt_template_categories_for_web3d_step4.js` — 同上
- `server/migrations/013_prompt_template_category_to_moduletag.js` — 新增迁移
- `server/models/promptTemplateModel.js` — category → module_tag，模糊匹配
- `server/services/promptTemplateService.js` — 校验改为 validateModuleTag
- `server/services/web3dAiStep4Service.js` — 'web3d_step4_analysis' → 'web3d'
- `server/services/tenderFieldParseService.js` — 'tender_field_parse' → 'tender'
- `server/services/aiPromptService.js` — getPromptsByCategory → getPromptsByModuleTag
- `server/controllers/aiController.js` — 4 处调用更新
- `server/middleware/promptTemplateValidation.js` — category → module_tag
- `server/init-db.js` — 表定义更新

### 前端
- `frontend/.../services/promptTemplate.ts` — 删除 OPTIONS，添加 getPromptModuleTags
- `frontend/.../pages/ModelConfig/Prompts/index.tsx` — 列名改为模块，API 驱动下拉
- `frontend/.../pages/ModelConfig/Prompts/Form.tsx` — showSearch+allowClear，autoSync 配置化
- `frontend/.../pages/Opportunity/components/TenderWebSearchModal.tsx` — `category: 'web_search'` → `module_tag: 'bidding_search'`
- `frontend/.../pages/Opportunity/components/TenderFieldParseModal.tsx` — `category: 'tender_field_parse'` → `module_tag: 'tender'`
