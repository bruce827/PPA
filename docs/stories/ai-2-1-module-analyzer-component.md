# Story AI-2.1: AI项目模块分析器组件

Status: drafted

## Story

作为一名项目评估人员,
我想要在工作量估算步骤中输入项目需求描述,
以便AI能够自动分析并生成结构化的功能模块列表(包含一、二、三级模块),然后一键导入到工作量估算表中。

## Acceptance Criteria

### AC1: AI模块梳理Tab页面
**Given** 用户在新建评估页面的工作量估算步骤
**When** 用户查看页面布局
**Then** 系统显示Tab标签页组件
**And** 包含三个Tab: "AI模块梳理"、"新功能开发"、"系统对接"
**And** 默认选中"AI模块梳理"标签
**When** 用户点击"AI模块梳理"Tab
**Then** 系统显示ProjectModuleAnalyzer组件

### AC2: 项目信息智能输入区域
**Given** AI模块梳理Tab已激活
**When** 用户查看输入区域
**Then** 系统显示"🎯 智能项目分析"Card组件
**And** 包含"项目类型"选择器,选项包括: Web应用、移动应用、桌面应用、企业级系统、物联网系统、AI/ML系统、区块链、自定义
**And** 包含"项目规模"选择器,选项包括: 小型项目(<3个月)、中型项目(3-12个月)、大型项目(1-2年)、企业级项目(>2年)
**And** 包含"详细项目描述"多行文本框,支持2000字以内,显示字符计数
**And** 提供占位符提示和输入建议

### AC3: 提示词配置区域
**Given** AI模块梳理Tab已激活
**When** 系统从后端加载提示词列表成功
**Then** 显示"🎯 智能配置"Card
**And** 包含"分析模板"下拉选择框
**And** 从API `/api/ai/module-prompts` 加载提示词列表
**When** 用户选择一个分析模板
**Then** 系统解析模板的变量配置
**And** 动态显示变量输入框,填充默认值

### AC4: 开始AI模块分析
**Given** 用户已输入项目描述
**When** 用户点击"开始AI模块分析"按钮
**Then** 系统验证项目描述非空
**And** 设置loading状态,禁用按钮
**And** 显示加载提示: "AI正在分析项目需求,生成模块结构..."
**And** 调用aiService.analyzeProjectModules方法
**And** 传递参数: description, projectType, projectScale, prompt, variables

### AC5: 分析结果展示
**Given** AI分析成功完成
**When** 系统接收到分析结果
**Then** 在结果区域显示"�� AI分析结果"Card
**And** 显示项目分析总结(100-200字)
**And** 显示"建议模块结构"预览
**And** 以Tree结构展示模块层级(一级→二级→三级)
**And** 每个模块显示: 模块名称、描述、复杂度标签
**And** 统计信息: 共X个一级模块,Y个二级模块,Z个三级模块
**And** 显示"导入到新功能开发"和"导入到系统对接"按钮

### AC6: 模块导入功能
**Given** AI分析结果已显示
**When** 用户点击"导入到新功能开发"按钮
**Then** 系统将分析结果的模块列表标准化处理
**And** 为每个模块生成唯一ID
**And** 设置复杂度对应的交付系数
**And** 初始化所有角色工作量为0
**And** 调用onModulesGenerated('dev', normalizedModules)
**And** 切换到"新功能开发"Tab
**And** 显示成功消息: "已将X个模块导入到新功能开发页面"
**When** 用户点击"导入到系统对接"按钮
**Then** 执行相同逻辑但调用onModulesGenerated('integration', normalizedModules)
**And** 切换到"系统对接"Tab

### AC7: 批量生成默认模板
**Given** 项目描述为空
**When** 用户选择项目类型(非"自定义")
**Then** 系统根据项目类型生成默认项目描述模板
**And** 自动填充到描述文本框
**When** 用户选择项目规模
**Then** 系统调整默认模块数量和复杂度建议

### AC8: 错误处理
**Given** 用户点击"开始AI模块分析"
**When** 项目描述为空
**Then** 显示警告: "请输入项目描述"
**When** AI分析API调用失败
**Then** 显示错误: "AI分析失败,请重试"
**And** 重置loading状态

## Tasks / Subtasks

### Task 1: 创建ProjectModuleAnalyzer组件 (AC: 1, 2)
- [ ] 1.1 创建 `frontend/ppa_frontend/src/pages/Assessment/components/ProjectModuleAnalyzer.tsx`
- [ ] 1.2 定义组件Props: onModulesGenerated, aiEnabled, roles
- [ ] 1.3 创建状态: projectDescription, projectType, projectScale, analysisResult, loading
- [ ] 1.4 定义projectTypes数组(8种类型,包含value, label, icon)
- [ ] 1.5 定义projectScales数组(4种规模选项)
- [ ] 1.6 实现组件基础布局结构

### Task 2: 实现智能输入区域 (AC: 2)
- [ ] 2.1 创建"🎯 智能项目分析"Card组件
- [ ] 2.2 添加项目类型Radio.Group,使用Radio.Button显示类型和图标
- [ ] 2.3 添加项目规模Select组件
- [ ] 2.4 添加详细项目描述TextArea
- [ ] 2.5 设置TextArea属性: rows={10}, maxLength={2000}, showCount
- [ ] 2.6 添加占位符和输入提示文本
- [ ] 2.7 绑定状态到表单控件

### Task 3: 实现提示词配置功能 (AC: 3)
- [ ] 3.1 添加availablePrompts, selectedPrompt, promptVariables状态
- [ ] 3.2 在useEffect中实现loadAvailablePrompts函数
- [ ] 3.3 调用 `fetch('/api/ai/module-prompts')` API
- [ ] 3.4 处理API响应,设置availablePrompts状态
- [ ] 3.5 创建"🎯 智能配置"Card(条件渲染)
- [ ] 3.6 添加"分析模板"Select组件
- [ ] 3.7 实现handlePromptChange,解析变量并初始化promptVariables
- [ ] 3.8 动态渲染提示词变量输入框(Row + Col布局)

### Task 4: 实现AI分析功能 (AC: 4)
- [ ] 4.1 实现handleAnalyze异步函数
- [ ] 4.2 添加项目描述非空验证
- [ ] 4.3 设置loading状态为true
- [ ] 4.4 调用aiService.analyzeProjectModules
- [ ] 4.5 传递完整参数对象
- [ ] 4.6 处理成功响应,设置analysisResult
- [ ] 4.7 处理错误,显示错误消息
- [ ] 4.8 finally块中重置loading状态
- [ ] 4.9 添加"开始AI模块分析"Button,绑定onClick事件

### Task 5: 实现分析结果展示 (AC: 5)
- [ ] 5.1 创建分析结果展示区域(条件渲染)
- [ ] 5.2 当loading时显示Spin + 提示文本
- [ ] 5.3 当analysisResult存在时显示"📋 AI分析结果"Card
- [ ] 5.4 显示项目分析总结(Typography.Paragraph)
- [ ] 5.5 实现模块Tree预览组件
- [ ] 5.6 使用Tree或自定义结构展示模块层级
- [ ] 5.7 为每个模块添加复杂度Tag(简单/中等/复杂,不同颜色)
- [ ] 5.8 计算并显示统计信息(Statistic组件)
- [ ] 5.9 添加操作按钮区域

### Task 6: 实现模块导入功能 (AC: 6)
- [ ] 6.1 实现handleApplyModules函数
- [ ] 6.2 验证analysisResult.modules存在
- [ ] 6.3 实现模块标准化逻辑normalizeWorkloadRecord
- [ ] 6.4 为每个模块生成唯一ID(createRowId工具函数)
- [ ] 6.5 根据复杂度设置delivery_factor
- [ ] 6.6 初始化所有角色工作量字段为0
- [ ] 6.7 调用onModulesGenerated回调,传递type和modules
- [ ] 6.8 显示成功消息
- [ ] 6.9 添加"导入到新功能开发"Button
- [ ] 6.10 添加"导入到系统对接"Button

### Task 7: 在WorkloadEstimation中集成 (AC: 1)
- [ ] 7.1 修改 `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx`
- [ ] 7.2 添加activeTab状态管理
- [ ] 7.3 导入ProjectModuleAnalyzer组件
- [ ] 7.4 创建Tabs组件,包含三个TabPane
- [ ] 7.5 第一个Tab: "AI模块梳理",渲染ProjectModuleAnalyzer
- [ ] 7.6 第二个Tab: "新功能开发",渲染现有开发工作量表
- [ ] 7.7 第三个Tab: "系统对接",渲染现有对接工作量表
- [ ] 7.8 实现handleAIGeneration函数处理模块导入
- [ ] 7.9 模块导入后切换到对应Tab

### Task 8: 实现默认模板生成 (AC: 7)
- [ ] 8.1 创建getDefaultDescriptionTemplate函数
- [ ] 8.2 为每种项目类型定义默认描述模板
- [ ] 8.3 在projectType变化时调用模板生成
- [ ] 8.4 自动填充到projectDescription
- [ ] 8.5 根据projectScale调整建议内容

### Task 9: 添加样式 (AC: 1-6)
- [ ] 9.1 创建 `ProjectModuleAnalyzer.less`
- [ ] 9.2 添加.project-module-analyzer容器样式
- [ ] 9.3 添加.smart-input-section样式
- [ ] 9.4 添加.analyze-action样式
- [ ] 9.5 添加.analysis-loading样式
- [ ] 9.6 添加.analysis-result样式
- [ ] 9.7 添加模块Tree的样式
- [ ] 9.8 添加统计信息区域样式
- [ ] 9.9 确保响应式设计

### Task 10: 错误处理和测试 (AC: 8)
- [ ] 10.1 添加项目描述验证
- [ ] 10.2 使用message.warning显示验证错误
- [ ] 10.3 添加API错误处理
- [ ] 10.4 测试模块分析功能
- [ ] 10.5 测试模块导入到新功能开发
- [ ] 10.6 测试模块导入到系统对接
- [ ] 10.7 测试Tab切换功能
- [ ] 10.8 测试默认模板生成
- [ ] 10.9 测试错误场景

## Dev Notes

### 技术栈
- **前端框架**: UMI Max + React + TypeScript
- **UI组件**: Ant Design (Tabs, Card, Radio, Select, TextArea, Tree, Tag, Button, Statistic, Spin)
- **状态管理**: React useState, useEffect hooks

### 组件层次
```
WorkloadEstimation.tsx (工作量估算主组件)
└── Tabs
    ├── TabPane: "AI模块梳理"
    │   └── ProjectModuleAnalyzer.tsx (新组件)
    │       ├── 智能输入Card
    │       ├── 提示词配置Card
    │       ├── 分析按钮
    │       └── 结果展示Card
    ├── TabPane: "新功能开发"
    │   └── [现有开发工作量表]
    └── TabPane: "系统对接"
        └── [现有对接工作量表]
```

### 文件路径
- 新组件: `frontend/ppa_frontend/src/pages/Assessment/components/ProjectModuleAnalyzer.tsx`
- 样式: `frontend/ppa_frontend/src/pages/Assessment/components/ProjectModuleAnalyzer.less`
- 修改: `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx`

### API依赖
- GET `/api/ai/module-prompts` - 获取模块分析提示词列表
- POST `/api/ai/analyze-project-modules` - 执行AI模块分析(后续实现)

### 数据结构

#### 模块分析请求
```typescript
interface AnalyzeModulesRequest {
  description: string;
  projectType: string;
  projectScale: string;
  prompt: Prompt;
  variables: Record<string, string>;
}
```

#### 模块分析结果
```typescript
interface AnalysisResult {
  project_analysis: string;
  modules: {
    module1: string;
    module2: string;
    module3: string;
    description: string;
    complexity: '简单' | '中等' | '复杂';
  }[];
}
```

#### 工作量记录(标准化后)
```typescript
interface WorkloadRecord {
  id: string;
  module1: string;
  module2: string;
  module3: string;
  description: string;
  delivery_factor: number;
  workload: number;
  [roleName: string]: number; // 各角色工作量
}
```

### 工具函数
```typescript
// utils/workloadUtils.js
export const createRowId = () => string;
export const getComplexityFactor = (complexity) => number;
export const normalizeWorkloadRecord = (record, roles) => WorkloadRecord;
```

### 设计参考
- 文档: `docs/new-assessment-ai-design-step2.md` (第1-300行)
- 用户故事: `docs/stories/ai_feature_user_stories.md` (Story 2)

### 注意事项
1. **Tab切换**: 导入模块后自动切换到对应Tab,确保用户能看到导入结果
2. **数据标准化**: 生成的模块必须包含所有必需字段,角色工作量初始化为0
3. **复杂度映射**: 简单→0.6, 中等→1.0, 复杂→1.4交付系数
4. **ID生成**: 使用时间戳+随机数确保唯一性
5. **状态管理**: 导入模块时需要调用父组件的状态更新函数
6. **错误恢复**: API失败时不影响现有数据

### Testing Strategy
- 测试项目类型和规模选择
- 测试AI分析触发和结果展示
- 测试模块导入到两个不同Tab
- 测试Tab切换和数据保持
- 测试默认模板生成

## Dev Agent Record

### Context Reference
<!-- Story context XML path -->

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
| 1.0 | 2025-11-09 | 初始创建 - AI项目模块分析器组件 | Bob (SM) |
