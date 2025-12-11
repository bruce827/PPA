# PPA 风险评分扩展来源 PRD

## 1. 背景与目标
- 当前风险评分仅来源于配置项（`risk_scores`），评分上限由配置动态计算，因子分段逻辑已稳定。
- 新需求：把 AI 一键评估未匹配到配置项的遗留风险，以及用户自定义风险，纳入风险总分计算并可视化管理。
- 目标：
  - 支持两类新来源：AI 未匹配风险项（0~100 分，可删除）、用户自定义风险项（10~100 分，可增删）。
  - 保障计算因子分段逻辑不变（maxScore 仍只取配置项最高分）。
  - 兼容历史项目数据（缺省字段时正常显示旧分数）。

## 2. 范围与不做
- 范围：新建评估向导的风险步骤、实时计算接口、导出、数据回显/持久化。
- 不做：改数据库表结构（沿用 JSON 字段）、改因子分段/上限算法、改风控/权限。

## 3. 角色与场景
- 评估工程师：通过 AI 一键评估得到部分未匹配项，手动补录自定义风险，保存评估。
- 销售/PM：查看历史项目详情/导出，看到完整风险明细（含 AI 未匹配、自定义）。

## 4. 需求详情
### 4.1 数据结构（assessmentData）
- 现有：`risk_scores: { [item_name]: number }`（配置项）。
- 新增：
  - `ai_unmatched_risks: { description: string; score: number }[]`，评分 0~100。
  - `custom_risk_items: { description: string; score: number }[]`，评分 10~100。
- 入库：仍存于 `assessment_details_json`；缺省时按空数组处理（兼容老数据）。

### 4.2 计算与算法
- 总风险分（分子）：`sum(risk_scores)` + `sum(ai_unmatched_risks.score)` + `sum(custom_risk_items.score)`。
- 最高分（分母）：仍由配置项最高选项分数累加；无配置时退回 100（不含新增两类）。
- 因子分段：保持现有分段与 1.5 封顶，>1 区间仍视为超标惩罚。
- 校验/容错（前后端字段与规则必须对齐）：
  - AI 未匹配项评分 0~100；自定义评分 10~100；描述必填。
  - 服务端强校验，越界/空描述直接 400 并返回友好错误；前端表单同步阻断提交并提示。
  - 计算时只累加合法项；非法数据不默默忽略。

### 4.3 前端 UX（新建评估风险步骤）
- 位置：
  - “配置项评分”保持现有表单。
  - “AI 智能风险评估”卡片内新增子块“未匹配风险项”（列表/表格），字段：描述（文本）、评分（0~100 数字输入），支持删除。
  - “自定义风险项”独立卡片/区域，动态行，字段：描述、评分（10~100 数字输入），支持新增/删除。
- 初始填充：
  - AI 未匹配项：来自 AI 返回的未匹配/遗留列表（现有 `missing_risks` 或未命名残留）自动写入 `ai_unmatched_risks`。
  - 自定义项：默认空。
- 实时计算预览：总分/因子显示需包含两类新增分数，maxScore 仍只显示配置上限。
- 表单校验：
  - 描述必填、评分范围校验；范围外禁止提交。
  - 配置项仍为必选。
- 回显：打开历史项目时，从 `assessment_details_json` 读取并填充三块数据。

### 4.4 AI 流程适配
- “应用评估结果”后，未被匹配到配置项的风险写入 `ai_unmatched_risks`，不自动写入 `risk_scores`。
- 用户可在未匹配列表中手动删除或编辑评分（范围 0~100）。

### 4.5 导出/展示
- 导出（Excel/PDF，仅 internal 版需要扩展）：在风险明细中增加“来源”分组：
  - 配置项：保持现有结构（类别/项名/选项/分数）。
  - AI 未匹配项：字段（来源=AI 未匹配、描述、分数 0~100）。
  - 自定义风险项：字段（来源=自定义、描述、分数 10~100）。
  - 总风险分校验包含三类来源。
- 项目概览/历史详情：`final_risk_score` 已含新来源，无需额外字段；若需明细视图，可按来源分组显示。

### 4.6 后端接口调整
- 计算接口 `/api/calculate`、项目创建/更新接口：接受并校验 `ai_unmatched_risks`、`custom_risk_items`。
- 详情接口：返回时透传新增字段（缺省时给空数组）。
- 校验失败返回 400，附错误提示。

## 5. 验收标准
1. 在风险步骤可新增/删除自定义风险项（10~100）并实时影响总分/因子。
2. AI 一键评估后，未匹配项自动出现在列表（0~100），可编辑/删除，并计入总分。
3. 计算接口/保存项目时，含三类来源的数据被正确求和，因子分段与现有一致。
4. 打开旧项目（无新增字段）不报错，计算结果与历史一致。
5. 导出（internal 版）显示三类风险来源明细，总分一致性校验通过。

## 6. 非功能与兼容
- 性能：新增列表规模有限（<50 行），计算仍在 200ms 内。
- 兼容：无表结构变更；缺省字段按空数组；前后端对齐同一校验范围。
- 安全：输入做服务端校验与前端约束，防止异常分值污染。

## 7. 交付与影响
- 影响面：前端风险步骤表单、AI 评估面板、实时计算调用、导出格式化、后端计算服务与校验。
- 回归：新建评估全流程；AI 一键评估应用后再保存；历史项目打开与导出。

## 8. 参考上下文（实现对齐用）
- 后端算法：`server/services/calculationService.js`（riskScore 求和）+ `server/utils/rating.js`（maxScore、分段因子）；常量 `server/utils/constants.js`。
- 配置来源：`config_risk_items` 表，模型 `server/models/configModel.js`。
- 前端实时计算：`frontend/ppa_frontend/src/utils/rating.ts`（本地总分/因子预览），风险步骤表单 `src/pages/Assessment/components/RiskScoringForm.tsx`，AI 面板 `src/pages/Assessment/components/AIAssessmentModal.tsx`，总览展示 `src/pages/Assessment/components/Overview.tsx`。
- 前端页面骨架：`src/pages/Assessment/New.tsx`（评估向导容器）、`Detail.tsx`（回显/详情）；组件使用 Ant Design ProForm（表单区）、Table/List（未匹配/自定义风险列表）、InputNumber（评分），保持现有 UMI/AntD 风格。
- 数据落库：最终保存在第 4 步提交时，通过 `projectService.createProject/updateProject` 传入 `assessmentData`，序列化到 `assessment_details_json`。
- 导出扩展：`server/services/exportService.js` 及内部 formatter，internal 版需分组展示来源。
- 数据库初始化/升级：`server/init-db.js` 需保持最新表结构，migrations 用于已有库增量升级。

## 9. ToDo
- 后端
  - [x] 扩展 `calculateProjectCost`：累加 `ai_unmatched_risks`（0~100）、`custom_risk_items`（10~100），非法直接 400。
  - [x] 更新项目创建/更新 DTO 校验，详情接口透传空数组兜底。
  - [x] 调整导出 formatter/internal，增加来源分组与总分一致性校验。
  - [x] 更新 `init-db.js`（若新增表/列时），同步 migrations，确保新环境与增量升级一致。（本次无表结构变更，无需修改）
- 前端
  - [x] 风险步骤表单新增两块：AI 未匹配列表（在 AI 卡片下）、自定义风险项动态行；范围校验与必填。
  - [x] `summarizeRisk` 同步加分子来源；实时预览与后端一致。
  - [x] AI 面板：未匹配项填充至 `ai_unmatched_risks`，支持编辑/删除。
  - [x] 保存 payload 带上两类数组，旧数据默认空数组回显。
- 测试
  - [ ] 后端单测：合法/越界/空描述报错，三来源混合；导出一致性。
  - [x] 前端：表单校验、AI 填充、总分/因子实时变更、历史项目回显；全流程 e2e（UI 验证完成）。
