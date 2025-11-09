# Story AI-3.1: 单模块AI工作量评估功能

Status: drafted

## Story

作为一名项目评估人员,
我想要在工作量估算表中针对任意功能模块点击"一键评估"按钮,
以便AI能够立即分析模块复杂度并给出按角色划分的建议工作量(人/天),为成本估算提供快速可靠的参考。

## Acceptance Criteria

### AC1: 在工作量表中添加一键评估操作
**Given** 用户在新功能开发或系统对接Tab页
**When** 用户查看工作量表格
**Then** 每一行记录的操作列包含"一键评估"按钮
**And** 按钮显示机器人图标和"一键评估"文本
**And** 按钮类型为link,颜色为primary

### AC2: 触发单模块评估
**Given** 工作量表中存在模块记录
**When** 用户点击某个模块的"一键评估"按钮
**Then** 系统设置evaluationLoading为true
**And** 设置currentEvaluatedRecord为当前记录
**And** 禁用该按钮,显示loading状态
**And** 调用aiService.evaluateWorkload方法
**And** 传递参数: module1, module2, module3, description, template

### AC3: 工作量评估API调用
**Given** 用户触发单模块评估
**When** 系统调用aiService.evaluateWorkload
**Then** 构建评估请求包含模块完整信息
**And** 向后端POST请求 `/api/ai/evaluate-workload`
**And** 请求体包含: module1, module2, module3, description
**And** 使用当前配置的AI模型
**And** 使用工作量评估提示词模板

### AC4: 评估结果弹窗展示
**Given** AI评估成功完成
**When** 系统接收到评估结果
**Then** 显示WorkloadEvaluationModal弹窗
**And** 弹窗标题为"🤖 AI工作量评估结果"
**And** 宽度为800px
**And** 包含"应用评估结果"和"取消"按钮
**And** 显示模块信息卡片
**And** 显示各角色工作量建议表格
**And** 显示成本预估信息
**And** 显示AI评估说明文本

### AC5: 模块信息展示
**Given** 评估结果弹窗已打开
**When** 用户查看弹窗内容
**Then** 在"📦 模块信息"区域显示:
**And** 一级模块: {module1}
**And** 二级模块: {module2}
**And** 三级模块: {module3}
**And** 功能描述: {description}
**And** 使用Descriptions组件,布局column=2

### AC6: 角色工作量建议展示
**Given** 评估结果弹窗已打开
**When** 用户查看工作量建议
**Then** 在"👥 各角色工作量建议"区域显示Table
**And** 列包含: 角色、建议工作量(天)、角色单价、预估成本
**And** 数据源为roles配置列表
**And** 每行显示角色名称
**And** 显示AI建议的工作天数(evaluationResult[role.role_name])
**And** 显示角色单价(role.unit_price)
**And** 计算并显示预估成本(工作量 × 单价)
**And** 表格尺寸为small

### AC7: 成本汇总展示
**Given** 评估结果弹窗已打开
**When** 用户查看成本信息
**Then** 在"💰 成本预估"区域显示:
**And** 总工作量: XX人/天(Statistic组件)
**And** 预估总成本: ¥XX,XXX.XX(Statistic组件)
**And** 平均复杂度: 中等(根据总工时判断)
**And** 使用Row + Col布局,每个统计占8列

### AC8: 应用评估结果
**Given** 用户查看评估结果弹窗
**When** 用户点击"应用评估结果"按钮
**Then** 系统从evaluationResult中提取各角色工作量
**And** 更新currentEvaluatedRecord的对应字段
**And** 计算总工时(所有角色工作量之和 × delivery_factor)
**And** 更新workload字段
**And** 记录AI评估使用信息到ai_evaluation_result字段
**And** 在工作量列表中更新该记录
**And** 关闭评估弹窗
**And** 清空currentEvaluatedRecord和evaluationResult
**And** 显示成功消息: "工作量评估结果已应用"

### AC9: 取消评估
**Given** 评估结果弹窗已打开
**When** 用户点击"取消"按钮或点击弹窗外部
**Then** 关闭评估弹窗
**And** 清空currentEvaluatedRecord和evaluationResult
**And** 不修改原模块数据

### AC10: 评估结果数据持久化
**Given** 用户应用了AI评估结果
**When** 系统更新模块记录
**Then** 在记录中添加ai_evaluation_result字段
**And** 包含: used=true, modelName, promptTemplate, evaluatedRoles, timestamp
**And** 该信息在第四步AI使用情况标注中可见

### AC11: 批量评估支持(可选功能)
**Given** 用户在工作量表中选择多个模块
**When** 用户点击批量操作中的"批量AI评估"按钮
**Then** 显示BatchEvaluationPanel组件
**And** 显示已选择X个模块
**And** 提供"开始批量评估"按钮
**When** 用户确认批量评估
**Then** 系统依次评估每个模块
**And** 显示进度条和当前评估任务
**And** 完成后自动应用所有评估结果
**And** 显示成功消息: "批量评估完成,已评估X个模块"

### AC12: 错误处理
**Given** 用户触发单模块评估
**When** 模块信息不完整(module3或description为空)
**Then** 显示警告: "模块信息不完整,无法评估"
**When** AI评估API调用失败
**Then** 显示错误: "工作量评估失败,请重试"
**And** 重置loading状态
**And** 关闭评估弹窗

## Tasks / Subtasks

### Task 1: 在工作量表中添加评估操作 (AC: 1)
- [ ] 1.1 修改 `WorkloadEstimation.tsx` 中的开发工作量表格columns定义
- [ ] 1.2 在操作列添加"一键评估"Button
- [ ] 1.3 设置Button属性: type="link", icon=<RobotOutlined />, size="small"
- [ ] 1.4 绑定onClick事件到handleSingleEvaluation
- [ ] 1.5 传递当前record作为参数
- [ ] 1.6 同样修改系统对接工作量表格
- [ ] 1.7 当evaluationLoading且currentEvaluatedRecord.id匹配时显示loading状态

### Task 2: 实现单模块评估逻辑 (AC: 2, 3)
- [ ] 2.1 在WorkloadEstimation组件中添加状态
- [ ] 2.2 创建evaluationLoading状态(boolean)
- [ ] 2.3 创建currentEvaluatedRecord状态(WorkloadRecord | null)
- [ ] 2.4 创建evaluationResult状态(any | null)
- [ ] 2.5 创建evaluationModalVisible状态(boolean)
- [ ] 2.6 实现handleSingleEvaluation异步函数
- [ ] 2.7 设置evaluationLoading=true和currentEvaluatedRecord
- [ ] 2.8 调用aiService.evaluateWorkload
- [ ] 2.9 传递完整参数对象
- [ ] 2.10 处理成功响应,设置evaluationResult和打开弹窗
- [ ] 2.11 处理错误,显示错误消息
- [ ] 2.12 finally块中重置loading状态

### Task 3: 创建WorkloadEvaluationModal组件 (AC: 4)
- [ ] 3.1 创建 `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEvaluationModal.tsx`
- [ ] 3.2 定义Props接口: visible, onClose, onApply, record, evaluationResult, roles
- [ ] 3.3 创建Modal组件结构
- [ ] 3.4 设置Modal属性: title, visible, onOk, onCancel, width=800
- [ ] 3.5 添加confirmLoading状态支持
- [ ] 3.6 实现handleApplyResult函数
- [ ] 3.7 验证evaluationResult存在
- [ ] 3.8 调用onApply回调

### Task 4: 实现模块信息展示 (AC: 5)
- [ ] 4.1 在Modal中创建"📦 模块信息"Card
- [ ] 4.2 使用Descriptions组件,column=2
- [ ] 4.3 添加Descriptions.Item: "一级模块"显示record.module1
- [ ] 4.4 添加Descriptions.Item: "二级模块"显示record.module2
- [ ] 4.5 添加Descriptions.Item: "三级模块"显示record.module3
- [ ] 4.6 添加Descriptions.Item: "功能描述"显示record.description,span=2
- [ ] 4.7 添加样式使信息清晰易读

### Task 5: 实现角色工作量建议展示 (AC: 6)
- [ ] 5.1 在Modal中创建"�� 各角色工作量建议"Card
- [ ] 5.2 定义Table columns
- [ ] 5.3 列1: 角色(dataIndex: 'role_name')
- [ ] 5.4 列2: 建议工作量(天)(render函数,显示evaluationResult[role.role_name])
- [ ] 5.5 列3: 角色单价(dataIndex: 'unit_price', 格式化为货币)
- [ ] 5.6 列4: 预估成本(render函数,计算工作量×单价,格式化为货币)
- [ ] 5.7 设置dataSource为roles
- [ ] 5.8 设置size="small", pagination=false
- [ ] 5.9 添加高亮样式显示有工作量的角色

### Task 6: 实现成本汇总展示 (AC: 7)
- [ ] 6.1 在Modal中创建"💰 成本预估"Card
- [ ] 6.2 计算总工作量: 遍历roles求和evaluationResult[role.role_name]
- [ ] 6.3 计算预估总成本: 总工作量×各角色单价之和
- [ ] 6.4 创建Row + Col布局
- [ ] 6.5 Col1(span=8): Statistic显示总工作量,单位"人/天"
- [ ] 6.6 Col2(span=8): Statistic显示预估总成本,prefix="¥"
- [ ] 6.7 Col3(span=8): 根据总工时判断复杂度(简单/中等/复杂)
- [ ] 6.8 添加样式美化统计卡片

### Task 7: 实现应用评估结果逻辑 (AC: 8, 10)
- [ ] 7.1 在handleApplyResult中提取evaluationResult数据
- [ ] 7.2 遍历roles,更新record的角色工作量字段
- [ ] 7.3 计算总工时: 所有角色工作量之和
- [ ] 7.4 应用delivery_factor计算最终workload
- [ ] 7.5 创建ai_evaluation_result对象
- [ ] 7.6 包含字段: used, modelName, promptTemplate, evaluatedRoles, timestamp, confidence
- [ ] 7.7 将ai_evaluation_result添加到record
- [ ] 7.8 调用onApply(updatedRecord)
- [ ] 7.9 父组件更新对应记录

### Task 8: 在WorkloadEstimation中处理应用 (AC: 8)
- [ ] 8.1 实现handleApplyEvaluation函数
- [ ] 8.2 验证currentEvaluatedRecord存在
- [ ] 8.3 在devWorkload或integrationWorkload中查找匹配记录
- [ ] 8.4 使用updatedRecord替换原记录
- [ ] 8.5 调用handleDevChange或handleIntegrationChange更新列表
- [ ] 8.6 关闭弹窗: setEvaluationModalVisible(false)
- [ ] 8.7 清空状态: setCurrentEvaluatedRecord(null), setEvaluationResult(null)
- [ ] 8.8 显示成功消息

### Task 9: 实现批量评估功能(可选) (AC: 11)
- [ ] 9.1 创建 `BatchEvaluationPanel.tsx` 组件
- [ ] 9.2 添加表格行选择功能(rowSelection)
- [ ] 9.3 创建selectedRowKeys和selectedRows状态
- [ ] 9.4 显示批量操作面板(条件渲染)
- [ ] 9.5 显示已选择模块数量
- [ ] 9.6 添加"开始批量评估"按钮
- [ ] 9.7 实现handleBatchEvaluation函数
- [ ] 9.8 使用for循环依次评估每个模块
- [ ] 9.9 显示Progress组件展示进度
- [ ] 9.10 显示当前评估任务信息
- [ ] 9.11 收集所有评估结果
- [ ] 9.12 批量更新模块列表
- [ ] 9.13 显示成功消息

### Task 10: 添加样式 (AC: 4-7)
- [ ] 10.1 创建 `WorkloadEvaluationModal.less`
- [ ] 10.2 添加.evaluation-result-content样式
- [ ] 10.3 添加.module-info样式
- [ ] 10.4 添加.workload-result样式
- [ ] 10.5 添加.cost-estimation样式
- [ ] 10.6 添加角色表格的高亮样式
- [ ] 10.7 添加统计卡片样式
- [ ] 10.8 确保响应式设计

### Task 11: 错误处理和验证 (AC: 12)
- [ ] 11.1 在handleSingleEvaluation中添加模块信息验证
- [ ] 11.2 检查module3和description是否为空
- [ ] 11.3 显示警告消息
- [ ] 11.4 添加API错误处理
- [ ] 11.5 使用message.error显示错误
- [ ] 11.6 确保loading状态正确重置

### Task 12: 测试 (AC: 1-12)
- [ ] 12.1 测试单模块评估触发
- [ ] 12.2 测试评估结果弹窗显示
- [ ] 12.3 测试模块信息展示正确
- [ ] 12.4 测试角色工作量计算正确
- [ ] 12.5 测试成本预估计算正确
- [ ] 12.6 测试应用评估结果
- [ ] 12.7 测试取消评估
- [ ] 12.8 测试数据持久化
- [ ] 12.9 测试批量评估(如已实现)
- [ ] 12.10 测试错误场景
- [ ] 12.11 测试在新功能开发Tab
- [ ] 12.12 测试在系统对接Tab

## Dev Notes

### 技术栈
- **前端框架**: UMI Max + React + TypeScript
- **UI组件**: Ant Design (Modal, Table, Descriptions, Statistic, Card, Button, Progress, Row, Col, Spin)
- **状态管理**: React useState, useEffect hooks

### 组件层次
```
WorkloadEstimation.tsx
├── [状态] evaluationLoading, currentEvaluatedRecord, evaluationResult, evaluationModalVisible
├── Tabs
│   ├── 新功能开发Tab
│   │   └── Table (添加"一键评估"操作列)
│   └── 系统对接Tab
│       └── Table (添加"一键评估"操作列)
└── WorkloadEvaluationModal.tsx (新组件)
    ├── 模块信息Card
    │   └── Descriptions
    ├── 角色工作量建议Card
    │   └── Table
    └── 成本预估Card
        └── Row + Col + Statistic
```

### 文件路径
- 新组件: `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEvaluationModal.tsx`
- 样式: `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEvaluationModal.less`
- 修改: `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx`
- 可选: `frontend/ppa_frontend/src/pages/Assessment/components/BatchEvaluationPanel.tsx`

### API依赖
- POST `/api/ai/evaluate-workload` - 执行单模块工作量评估(后续实现)

### 数据结构

#### 工作量评估请求
```typescript
interface EvaluateWorkloadRequest {
  module1: string;
  module2: string;
  module3: string;
  description: string;
  template?: string;
}
```

#### 工作量评估结果
```typescript
interface EvaluationResult {
  [roleName: string]: number; // 各角色建议工作天数
  confidence?: number;
  complexity?: string;
}
```

#### AI评估记录
```typescript
interface AIEvaluationRecord {
  used: boolean;
  modelName: string;
  modelProvider: string;
  promptTemplate: string;
  evaluatedRoles: string[];
  timestamp: string;
  confidence?: number;
}
```

#### 更新后的工作量记录
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
  ai_evaluation_result?: AIEvaluationRecord; // 新增字段
}
```

### 计算逻辑
```typescript
// 总工作量计算
const totalWorkDays = roles.reduce((sum, role) => {
  return sum + (evaluationResult[role.role_name] || 0);
}, 0);

// 最终工时(考虑交付系数)
const finalWorkload = totalWorkDays * record.delivery_factor;

// 预估成本计算
const estimatedCost = roles.reduce((sum, role) => {
  const days = evaluationResult[role.role_name] || 0;
  return sum + (days * role.unit_price);
}, 0);

// 复杂度判断
const complexity = totalWorkDays < 20 ? '简单' : 
                   totalWorkDays < 50 ? '中等' : '复杂';
```

### 设计参考
- 文档: `docs/new-assessment-ai-design-step2.md` (第580-780行)
- 用户故事: `docs/stories/ai_feature_user_stories.md` (Story 3)

### 注意事项
1. **按钮状态**: 评估进行时禁用按钮,防止重复点击
2. **数据验证**: 评估前检查模块信息完整性
3. **结果应用**: 必须保留原有的delivery_factor,不能覆盖
4. **AI记录**: 评估结果必须记录AI使用信息供第四步展示
5. **成本计算**: 使用配置中的角色单价计算,确保准确性
6. **批量评估**: 注意API调用频率控制,避免过载
7. **用户反馈**: 提供清晰的加载状态和操作反馈

### Testing Strategy
- 测试单个模块评估完整流程
- 测试评估结果的正确性(工作量、成本)
- 测试应用结果后数据更新
- 测试取消操作不影响数据
- 测试错误处理和边界情况
- 测试批量评估(如已实现)

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
| 1.0 | 2025-11-09 | 初始创建 - 单模块AI工作量评估功能 | Bob (SM) |
