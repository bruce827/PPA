# Web3D Step4 AI 会话纪要 - 2026-04-07

## 会话目标

围绕 `/web3d/new` 的 Step4，完成一套可用的 AI 模块梳理/工作量映射能力，并把 AI 返回的说明直接落到 Step4 表格中。

## 本次已确认的产品决策

### 1. Web3D Step4 AI 走独立视觉模型链路

- 不复用现有通用文本 provider
- 单独支持视觉模型
- 当前确认支持：
  - Gemini Vision
  - MiniMax Vision

### 2. 图片上传限制

- 最多 `3` 张

### 3. AI 调用必须接入 AI Log

- 写数据库日志
- 写文件日志
- 图片保存到日志目录

### 4. Step4 的说明字段只保留一个

最终收敛为单字段：

- `原因说明`

该字段语义为：

- AI 可初始化
- 用户可直接编辑
- 保存后的最终值以当前表格内容为准

不再单独新增 `备注` 字段。

### 5. AI 覆盖策略已调整为“尽量映射，不整次失败”

如果 AI 输出里只有部分工作项能和系统模板精确匹配：

- 已匹配行先覆盖到 Step4
- 未匹配项在前端明确提示
- 用户可手动补剩余项

## 本次已完成的实现

### 1. Web3D Step4 AI 功能

前端新增 AI 卡片：

- `frontend/ppa_frontend/src/pages/Web3D/components/Web3DAiStep4Analyzer.tsx`

能力包括：

- 选择 Step4 专用提示词模板
- 输入模板变量
- 上传最多 3 张图片
- 自动拼接 Step1-3 上下文
- 预览 coverage
- 覆盖 Step4 表格

后端新增 Web3D Step4 AI 服务：

- `server/controllers/web3dAiController.js`
- `server/services/web3dAiStep4Service.js`
- `server/providers/ai/visionProviderSelector.js`
- `server/providers/ai/geminiVisionProvider.js`
- `server/providers/ai/minimaxVisionProvider.js`

### 2. 模型配置支持视觉模型

已新增视觉能力字段：

- `supports_vision`
- `is_current_vision`

相关改动：

- `server/init-db.js`
- `server/migrations/010_add_vision_flags_to_ai_model_configs.js`
- `server/models/aiModelModel.js`
- `server/services/aiModelService.js`
- `frontend/ppa_frontend/src/pages/ModelConfig/Application/index.tsx`
- `frontend/ppa_frontend/src/pages/ModelConfig/Application/components/ModelForm.tsx`
- `frontend/ppa_frontend/src/services/aiModel/typings.d.ts`

### 3. 提示词模板支持 Web3D Step4 分类

新增分类：

- `web3d_step4_analysis`

相关改动：

- `server/utils/promptTemplateCategories.js`
- `server/migrations/011_expand_prompt_template_categories_for_web3d_step4.js`
- `frontend/ppa_frontend/src/services/promptTemplate.ts`

### 4. Gemini provider 已改为 `v1beta`

原先 Gemini 3 测试失败，原因是项目代码调用了 `v1`。
本次已改为 `v1beta`：

- `server/providers/ai/geminiProvider.js`
- `server/providers/ai/geminiVisionProvider.js`

之后 UI 中 Gemini 模型测试已成功。

### 5. Step4 新增“原因说明”字段，并贯通保存/导出

已实现：

- Step4 表格显示并可编辑 `原因说明`
- AI 覆盖时一起带入 `reason`
- 保存到 `assessment.workload_items[*].reason`
- Step5 工作量明细展示 `原因说明`
- Excel 导出“工作量明细”增加 `原因说明`

相关改动：

- `frontend/ppa_frontend/src/pages/Web3D/New.tsx`
- `frontend/ppa_frontend/src/services/web3d/typings.d.ts`
- `server/services/export/formatters/web3dFormatter.js`
- `server/services/export/renderers/web3dRenderer.js`

### 6. AI 覆盖逻辑改为“部分成功 + 未映射提示”

当前后端行为：

- coverage 中能严格命中的项正常保留
- `step4_rows` 中能命中的项正常应用
- 未命中的项返回：
  - `unmapped_items`
  - `missing_template_items`
- 只要存在可映射行，就不因单个工作项名跑偏而整次失败

当前前端行为：

- 分析完成后提示“已自动映射 N 行，另有 M 项需要手动处理”
- 点击覆盖时只覆盖已映射成功的行

## 本次定位过的关键问题

### 1. 启动失败

报错：

- `runProjectPushRecordsMigration is not a function`

已修复：

- `server/migrations/009_project_push_records.js`

### 2. Gemini 模型测试失败

根因：

- `v1` API version 不适配当前测试模型

已修复为：

- Gemini provider 改走 `v1beta`

### 3. Step4 AI 报错的真实原因

在下面这条日志中定位到：

- `server/logs/ai/web3d_step4/2026-04-07/002410_d5afc6df083a/`

关键现象：

- AI 把 `场景搭建与基础交互` 改写成了 `场景搭建 with 基础交互`

结论：

- 问题来自模型输出对模板项名的改写
- 不是图片上传问题
- 不是新加的 `原因说明` 字段问题

后续处理策略已收敛为：

- 提示词加强约束
- 后端不做语义归一化
- 只允许“部分成功 + 未映射提示”

## 用户已明确确认的约束

1. 图片限制最多 `3` 张
2. Step4 说明字段必须可编辑
3. 不新增单独 `备注` 字段
4. 提示词可继续加强
5. 后端不做“with -> 与”这类语义归一化
6. 允许“先映射能映射上的，剩余你手动处理”

## 当前状态

### 已验证通过

- Web3D Step4 AI 覆盖基础链路可用
- Step4 `原因说明` 已能落到表格
- 保存不会因该字段影响计算
- 后端测试通过：
  - `web3dAiStep4.service.test.js`
  - `web3d.service.test.js`
- 前端构建通过：
  - `yarn build`

### 当前仍建议做的事情

1. 在提示词模板管理中，把 Web3D Step4 的模板替换为“更严格逐字复制模板项名”的版本
2. 手动再回归一轮：
   - Step4 AI 分析
   - 部分映射成功场景
   - 手改 `原因说明`
   - 保存项目
   - 导出 Excel
3. 如再次出现乱码，再只做“乱码清洗”，不做语义归一化

## 明天继续时建议优先做的顺序

1. 更新提示词模板为更严格版本
2. 浏览器实测 `/web3d/new`
3. 验证“部分成功 + 未映射提示”在真实模型输出下的体验
4. 如有必要，再补一层极窄的乱码修复

## 关键文件清单

- `frontend/ppa_frontend/src/pages/Web3D/New.tsx`
- `frontend/ppa_frontend/src/pages/Web3D/components/Web3DAiStep4Analyzer.tsx`
- `frontend/ppa_frontend/src/services/web3d/index.ts`
- `frontend/ppa_frontend/src/services/web3d/typings.d.ts`
- `server/services/web3dAiStep4Service.js`
- `server/controllers/web3dAiController.js`
- `server/routes/web3d.js`
- `server/services/aiFileLogger.js`
- `server/providers/ai/geminiProvider.js`
- `server/providers/ai/geminiVisionProvider.js`
- `server/services/export/formatters/web3dFormatter.js`
- `server/services/export/renderers/web3dRenderer.js`
- `server/tests/web3dAiStep4.service.test.js`
- `server/tests/web3d.service.test.js`

## 备注

本文件用于明天恢复上下文，避免重新梳理 Web3D Step4 AI 的设计、实现和问题边界。
