# Story AI-1.1: AI风险评估弹窗组件

Status: ready-for-dev

## Story

作为一名项目评估人员,
我想要在风险评分步骤中点击"一键AI评估"按钮并上传/粘贴项目文档,
以便AI能够分析文档并提供风险项评分建议,节省手动分析时间。

## Acceptance Criteria

### AC1: AI评估按钮和弹窗触发
**Given** 用户在新建评估页面的风险评分步骤
**When** 用户查看风险评分表单
**Then** 系统在风险项表单下方显示"🤖 AI智能风险评估"区域
**And** 区域内包含"一键AI评估"按钮和提示文本
**When** 用户点击"一键AI评估"按钮
**Then** 系统打开AI评估弹窗(Modal)

### AC2: 项目文档输入功能
**Given** AI评估弹窗已打开
**When** 用户查看弹窗内容
**Then** 系统显示"📄 项目文档"输入区域
**And** 提供多行文本输入框,支持5000字以内的文档内容
**And** 显示字符计数
**And** 提供占位符提示:"请输入项目招标文件内容或项目要求描述..."

### AC3: 提示词选择和配置
**Given** AI评估弹窗已打开
**When** 用户查看"⚙️ 评估配置"区域
**Then** 系统显示"选择提示词模板"下拉选择框
**And** 从后端API `/api/ai/prompts` 加载可用的提示词列表
**And** 显示"模型信息"输入框,展示当前使用的AI模型(禁用状态)
**When** 用户选择一个提示词模板
**Then** 系统解析提示词的变量配置
**And** 动态显示"🔧 提示词变量配置"区域
**And** 为每个变量生成对应的输入框,填充默认值

### AC4: 开始AI评估功能
**Given** 用户已输入项目文档内容
**And** 用户已选择提示词模板
**When** 用户点击"开始AI评估"按钮
**Then** 系统验证文档内容非空
**And** 系统验证已选择提示词模板
**And** 显示加载状态: "AI正在分析项目文档,评估风险项..."
**And** 调用后端API `/api/ai/assess-risk` 发送评估请求
**And** 请求体包含: document, prompt, variables, currentRiskItems, currentScores
**And** 后端返回AI模型原始响应
**And** 系统将AI模型响应解析并格式化为规范的评估结果结构
**And** 验证格式化后的数据完整性(risk_scores必填)

### AC5: 评估结果展示
**Given** AI评估成功完成
**When** 系统接收到评估结果
**Then** 在"📊 评估结果"区域显示评估内容
**And** 显示"🎯 风险项评分建议"表格,包含列:风险项名称、建议评分、评估理由
**And** 如果存在缺失风险项,显示"⚠️ 可能缺失的风险项"Alert列表
**And** 显示"💡 总体建议"卡片,展示overall_suggestion文本
**And** "应用评估结果"按钮变为可点击状态

### AC6: 应用评估结果到表单
**Given** 评估结果已显示
**When** 用户点击"应用评估结果"按钮
**Then** 系统将AI建议的风险项评分自动填充到风险评分表单
**And** 更新表单的assessmentData状态
**And** 调用form.setFieldsValue()更新表单值
**And** 显示成功消息:"AI评估结果已应用到风险评分表单"
**And** 关闭AI评估弹窗

### AC7: 错误处理
**Given** 用户点击"开始AI评估"
**When** 文档内容为空
**Then** 显示警告消息:"请输入项目文档内容"
**When** 未选择提示词模板
**Then** 显示警告消息:"请选择提示词模板"
**When** AI评估API调用失败
**Then** 显示错误消息:"AI评估失败,请重试"
**And** 停止加载状态

## Tasks / Subtasks

### Task 1: 创建AI评估Modal组件 (AC: 1, 2, 3)
- [ ] 1.1 在 `frontend/ppa_frontend/src/pages/Assessment/components/` 创建 `AIAssessmentModal.tsx`
- [ ] 1.2 实现Modal基础结构(Ant Design Modal组件)
- [ ] 1.3 添加项目文档输入区域(TextArea组件,maxLength: 5000, showCount)
- [ ] 1.4 添加提示词选择下拉框(Select组件)
- [ ] 1.5 添加模型信息显示(Input disabled)
- [ ] 1.6 实现提示词变量动态配置区域
- [ ] 1.7 添加评估结果展示区域(初始为空)
- [ ] 1.8 实现Modal的打开/关闭状态管理

### Task 2: 在RiskScoringForm集成AI评估区域 (AC: 1)
- [ ] 2.1 在 `RiskScoringForm.tsx` 组件中添加AI评估Section
- [ ] 2.2 创建"🤖 AI智能风险评估"Card组件
- [ ] 2.3 添加"一键AI评估"Button(type: primary, icon: RobotOutlined)
- [ ] 2.4 添加提示文本(InfoCircleOutlined + 说明)
- [ ] 2.5 实现aiAssessmentVisible状态管理
- [ ] 2.6 将AIAssessmentModal组件集成到RiskScoringForm

### Task 3: 实现提示词加载功能 (AC: 3)
- [ ] 3.1 在AIAssessmentModal的useEffect中调用loadAvailablePrompts
- [ ] 3.2 实现loadAvailablePrompts异步函数
- [ ] 3.3 调用 `fetch('/api/ai/prompts')` API
- [ ] 3.4 将返回的提示词列表存储到availablePrompts状态
- [ ] 3.5 实现错误处理(console.error)
- [ ] 3.6 实现handlePromptChange函数,解析选中提示词的变量
- [ ] 3.7 初始化promptVariables状态,填充默认值

### Task 4: 实现AI评估功能 (AC: 4)
- [ ] 4.1 实现handleAssessment异步函数
- [ ] 4.2 添加文档内容和提示词验证逻辑
- [ ] 4.3 设置loading状态为true
- [ ] 4.4 调用后端API `/api/ai/assess-risk`
- [ ] 4.5 传递参数: document, prompt, variables, currentRiskItems, currentScores
- [ ] 4.6 接收后端返回的AI模型原始响应
- [ ] 4.7 实现parseAIResponse函数,解析AI模型响应
- [ ] 4.8 将AI响应格式化为AssessmentResult标准结构
- [ ] 4.9 验证必填字段(risk_scores)存在且格式正确
- [ ] 4.10 处理成功响应,设置assessmentResult状态
- [ ] 4.11 显示成功消息: "AI评估完成"
- [ ] 4.12 处理解析错误和API错误,显示错误消息
- [ ] 4.13 finally块中设置loading为false

### Task 5: 实现评估结果展示 (AC: 5)
- [ ] 5.1 在"📊 评估结果"区域添加条件渲染逻辑
- [ ] 5.2 当loading时显示Spin组件和提示文本
- [ ] 5.3 当assessmentResult存在时显示结果内容
- [ ] 5.4 创建"🎯 风险项评分建议"Table组件
- [ ] 5.5 Table columns: 风险项名称、建议评分、评估理由
- [ ] 5.6 Table dataSource: assessmentResult.risk_scores
- [ ] 5.7 条件渲染"⚠️ 可能缺失的风险项"Alert
- [ ] 5.8 显示missing_risks列表(Tag组件)
- [ ] 5.9 创建"💡 总体建议"Card,显示overall_suggestion
- [ ] 5.10 当无结果时显示"开始AI评估"按钮占位符

### Task 6: 实现应用评估结果功能 (AC: 6)
- [ ] 6.1 实现handleApplyResult函数
- [ ] 6.2 验证assessmentResult存在
- [ ] 6.3 调用onAssessmentComplete回调,传递assessmentResult
- [ ] 6.4 关闭Modal(onClose)
- [ ] 6.5 在New.tsx中实现handleAIAssessmentComplete函数
- [ ] 6.6 遍历risk_scores,更新assessmentData
- [ ] 6.7 调用setAssessmentData更新状态
- [ ] 6.8 调用form.setFieldsValue填充表单
- [ ] 6.9 显示成功消息

### Task 7: 添加样式和UI优化 (AC: 1, 2, 3, 5)
- [ ] 7.1 创建 `frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.less`
- [ ] 7.2 添加.ai-assessment-section样式(border, padding, background)
- [ ] 7.3 添加.ai-assessment-tips样式
- [ ] 7.4 添加.ai-assessment-modal样式
- [ ] 7.5 添加.document-input-section样式
- [ ] 7.6 添加.prompt-config-section样式
- [ ] 7.7 添加.risk-scores-suggestion样式(green theme)
- [ ] 7.8 添加.missing-risks-suggestion样式(orange theme)
- [ ] 7.9 添加.overall-suggestion样式(blue theme)
- [ ] 7.10 确保响应式设计

### Task 8: 错误处理和用户反馈 (AC: 7)
- [ ] 8.1 在handleAssessment中添加空文档验证
- [ ] 8.2 添加未选择提示词验证
- [ ] 8.3 使用message.warning显示验证错误
- [ ] 8.4 在try-catch中使用message.error显示API错误
- [ ] 8.5 添加AI响应解析失败处理(JSON格式错误、缺失必填字段)
- [ ] 8.6 显示具体的解析错误信息给用户
- [ ] 8.7 确保所有错误情况都重置loading状态
- [ ] 8.8 添加网络超时处理
- [ ] 8.9 测试各种错误场景(包括格式错误的AI响应)

### Task 9: 集成测试 (AC: All)
- [ ] 9.1 测试AI评估按钮点击打开Modal
- [ ] 9.2 测试文档输入和字符计数
- [ ] 9.3 测试提示词选择和变量动态显示
- [ ] 9.4 测试开始评估按钮(需要后端API配合)
- [ ] 9.5 测试评估结果展示
- [ ] 9.6 测试应用结果到表单
- [ ] 9.7 测试取消操作
- [ ] 9.8 测试各种错误处理场景
- [ ] 9.9 测试Modal关闭后状态重置
- [ ] 9.10 测试与现有风险评分表单的集成

## Dev Notes

### 技术栈和架构
- **前端框架**: UMI Max + React + TypeScript
- **UI组件库**: Ant Design (Modal, Input, Select, Table, Card, Alert, Spin, Button, message)
- **状态管理**: React useState hooks
- **API调用**: fetch API (需后续实现aiService)

### 组件层次结构
```
New.tsx (评估向导主页面)
└── RiskScoringForm.tsx (风险评分表单,Step 1)
    ├── [现有风险项表单]
    ├── AI评估Section (新增)
    │   └── "一键AI评估"Button
    └── AIAssessmentModal.tsx (新增Modal组件)
        ├── 项目文档输入区域
        ├── 提示词配置区域
        ├── 评估结果展示区域
        └── 操作按钮(开始评估/应用结果/取消)
```

### 项目文件路径
- Modal组件: `frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.tsx`
- 样式文件: `frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.less`
- 修改文件: `frontend/ppa_frontend/src/pages/Assessment/components/RiskScoringForm.tsx`
- 修改文件: `frontend/ppa_frontend/src/pages/Assessment/New.tsx`

### API依赖(后续Story实现)
- GET `/api/ai/prompts` - 获取可用的提示词列表
- POST `/api/ai/assess-risk` - 执行AI风险评估

### 数据结构

#### 提示词对象 (Prompt)
```typescript
interface Prompt {
  id: string;
  name: string;
  content: string; // 提示词模板内容
  variables?: {
    name: string;
    default_value?: string;
  }[];
}
```

#### AI评估请求
```typescript
interface AssessRiskRequest {
  document: string;
  prompt: Prompt;
  variables: Record<string, string>;
  currentRiskItems: RiskItem[];
  currentScores: Record<string, number>;
}
```

#### AI评估结果
```typescript
interface AssessmentResult {
  risk_scores: {
    item_name: string;
    suggested_score: number;
    reason: string;
  }[];
  missing_risks?: {
    item_name: string;
    description: string;
  }[];
  overall_suggestion: string;
  confidence?: number;
}
```

#### AI模型原始响应格式
```typescript
// 后端API返回的原始AI模型响应
interface AIModelRawResponse {
  success: boolean;
  data: {
    raw_response: string; // AI模型的JSON字符串或文本响应
    model_used: string;
    timestamp: string;
  };
  error?: string;
}
```

### 设计参考
- 参考文档: `docs/new-assessment-ai-design-step1.md`
- UI设计原则: 简洁、直观、提供即时反馈
- 交互流程: 输入文档 → 配置提示词 → 开始评估 → 查看结果 → 应用结果

### 注意事项
1. **非交互模式**: 本故事专注于前端UI实现,AI评估功能暂时使用mock数据或需要后端API配合
2. **模型配置**: "当前使用的模型"信息需要从后端获取,当前可以hardcode为"GPT-4"
3. **提示词管理**: 提示词列表从 `/api/ai/prompts` API获取,该API在后续Story中实现
4. **状态管理**: 确保Modal关闭后重置所有内部状态(文档内容、评估结果等)
5. **表单集成**: 应用结果时需要正确更新RiskScoringForm的表单状态,保持数据同步
6. **数据解析**: AI模型可能返回JSON或纯文本,需要实现鲁棒的解析逻辑
7. **数据验证**: 解析后必须验证risk_scores数组存在且每项包含必填字段(item_name, suggested_score, reason)
8. **容错处理**: 如果AI响应格式不符合预期,应提供友好的错误提示,不应导致应用崩溃

### Testing Strategy
- **单元测试**: 测试组件渲染、状态管理、事件处理
- **集成测试**: 测试与RiskScoringForm的集成、表单数据流
- **E2E测试**: 测试完整的AI评估流程(需要mock API)

### References
- [PRD: AI功能集成](../PRD.md#ai-integration)
- [设计文档: 风险评估AI功能](../new-assessment-ai-design-step1.md)
- [用户故事: AI驱动的风险评估](../stories/ai_feature_user_stories.md#用户故事-1)
- [Ant Design Modal文档](https://ant.design/components/modal-cn/)
- [UMI Max文档](https://umijs.org/docs/max/introduce)

## Dev Agent Record

### Context Reference

- `docs/stories/ai-1-1-risk-assessment-ai-modal.context.xml` - 生成于 2025-11-09

### Agent Model Used

_待填写_

### Debug Log References

_待填写_

### Completion Notes List

_待填写_

### File List

_待填写_

## Change Log

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2025-11-09 | 初始创建 - AI风险评估Modal组件 | Bob (SM) |
