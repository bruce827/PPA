# 评估模板与一键填充能力

**版本**: v1.0
**最后更新**: 2026-04-25
**适用范围**: 项目评估模块（/assessment/new），模板相关功能
**状态**: ⚠️ 部分实现（见下方说明）

---

## 实现状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 另存为模板（Step4 is_template） | ✅ 已完成 | `is_template` 唯一约束、后端 `clearAllTemplateFlags` 逻辑均已实现 |
| 从模板一键创建评估 | ✅ 已完成 | `New.tsx` 支持 `?template_id=` URL 参数，直接加载模板数据 |
| 从模板导入（Step0） | ✅ 已完成 | `New.tsx` 第 0 步弹窗选择模板，完整导入风险+工作量+差旅 |
| 一键填充样例数据（Step1/Step2） | ⚠️ 按钮隐藏 | 逻辑已实现，但 Step1 `RiskScoringForm.tsx` 和 Step2 `WorkloadEstimation.tsx` 的填充按钮被 `display:none` 隐藏，需前端解除隐藏并联调 |

---

## 1. 核心概念

### 评估模板（Assessment Template）

> 评估模板 = 一次完整评估（风险 + 工作量 + 其他成本）的快照，用于后续快速填充和复制。

- 数据载体沿用现有 `projects` 记录：
  - 使用 `is_template = true` 标记为**当前模板项目**。
  - `assessment_details_json` 保存完整表单数据。
- 模板的**唯一性约束**：
  - 任意时刻全系统最多只允许存在 **1 条** `is_template = 1` 的项目记录。
  - 保存新模板时，后端自动将其他项目的 `is_template` 置为 `0`。

---

## 2. 已实现的功能

### 2.1 第 4 步：另存为模板

- `Overview.tsx` 第 761 行：`ProFormCheckbox name="is_template">另存为模板`
- 保存时后端调用 `projectModel.clearAllTemplateFlags()` 确保唯一性
- 模板项目在历史列表和第 0 步模板弹窗中均有标识

### 2.2 第 0 步：从模板导入

- `New.tsx` 第 387-402 行：模板弹窗 `handleOpenTemplateModal`
- `New.tsx` 第 823-907 行：弹窗内表格展示 `is_template` 项目列表
- `New.tsx` 第 405-449 行：`handleImportFromTemplate` 完整解析 `assessment_details_json` 并填充所有表单

### 2.3 从模板一键创建评估

- `New.tsx` 第 71 行：`const templateId = searchParams.get('template_id');`
- 组件挂载时根据 `template_id` 自动加载模板数据并填充表单

### 2.4 一键填充（逻辑已实现，按钮隐藏）

- `RiskScoringForm.tsx` 第 83-175 行：`handleFillFromTemplate` 逻辑完整，按钮在第 273-279 行被 `style={{ display: 'none' }}` 隐藏
- `WorkloadEstimation.tsx` 第 488-566 行：`handleFillFromTemplate` 逻辑完整，两处按钮在第 797-804、851-858 行被 `style={{ display: 'none' }}` 隐藏
- 若无模板：`RiskScoringForm.tsx` 和 `WorkloadEstimation.tsx` 中均有"当前没有可用模板"的提示逻辑

---

## 3. 待完成

- [ ] 解除 Step1/Step2 一键填充按钮的隐藏状态（`display:none`）
- [ ] 一键填充按钮与模板系统联调测试
- [ ] 模板名称字段（当前直接复用项目名称）

---

## 4. 后续可增强

- 模板管理页面（列表、编辑、删除）
- 支持多模板
- 模板标签/分类管理
- 模板推荐（基于历史项目相似度）

---

**修订历史**:
- v0.1 (2025-11-21): 初稿
- v1.0 (2026-04-25): 以实际实现为准更新，标注 Feature 2 按钮隐藏的已知问题
