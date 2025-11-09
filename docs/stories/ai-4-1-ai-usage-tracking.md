# Story AI-4.1: AI使用情况标注与追溯功能

Status: drafted

## Story

作为一名项目评估人员或管理者,
我想要在总览页面上看到清晰的"AI使用情况"摘要,
以便准确了解在本次评估中哪些环节使用了AI辅助、调用了哪个AI模型以及使用了哪个提示词模板,确保整个评估过程的透明性和可追溯性。

## Acceptance Criteria

### AC1: AI使用情况面板位置
**Given** 用户完成评估到达第四步总览页面
**When** 用户查看Overview组件
**Then** 在总览内容下方显示"🤖 AI模型使用情况"Card
**And** Card使用独立的.ai-usage-annotation容器
**And** 面板在"继续按钮"之前显示
**And** 面板具有特殊的视觉样式(边框和背景色)

### AC2: 收集AI使用情况数据
**Given** Overview组件渲染
**When** 组件加载时(useEffect)
**Then** 执行collectAIUsageInfo函数
**And** 检查assessmentData.ai_assessment_result(风险评估)
**And** 检查assessmentData.ai_module_analysis(模块分析)
**And** 遍历development_workload检查ai_evaluation_result
**And** 遍历integration_workload检查ai_evaluation_result
**And** 汇总所有AI使用信息到aiUsageInfo状态
**And** 记录收集时间戳

### AC3: 未使用AI时的显示
**Given** 本次评估未使用任何AI功能
**When** 系统检测到totalAiUsage为0
**Then** 显示空状态Card
**And** 标题为"🤖 AI模型使用情况"
**And** 内容显示绿色InfoCircleOutlined图标
**And** 文本: "本次评估未使用AI辅助功能，所有数据均来自手动输入"
**And** 使用.ai-usage-empty样式类

### AC4: AI使用概况统计
**Given** 本次评估使用了AI功能
**When** 用户查看AI使用面板
**Then** 在顶部显示使用概况(ai-usage-summary)
**And** 左侧显示Statistic: AI辅助环节数量
**And** Statistic值为totalAiUsage
**And** Statistic标题为"AI辅助环节"
**And** 使用蓝色前缀图标RobotOutlined
**And** 右侧显示最后更新时间
**And** 格式为"最后更新: YYYY-MM-DD HH:mm:ss"

### AC5: 风险评估AI使用情况展示
**Given** 用户在风险评分步骤使用了AI评估
**When** aiUsageInfo.riskAssessment存在
**Then** 在详情区域显示风险评估AI使用卡片
**And** 标题显示: 📊 风险评估环节
**And** 显示模型信息: GPT-4 (来自模型配置)
**And** 显示提供商: OpenAI
**And** 显示提示词模板名称
**And** 显示功能特性Tag列表(风险项评分建议、缺失风险项识别、总体建议)
**And** 显示置信度(Progress条,百分比显示)
**And** 显示使用时间

### AC6: 模块分析AI使用情况展示
**Given** 用户在工作量估算步骤使用了AI模块分析
**When** aiUsageInfo.moduleAnalysis存在
**Then** 在详情区域显示模块分析AI使用卡片
**And** 标题显示: 🧩 模块梳理环节
**And** 显示模型信息: GPT-4 (来自模型配置)
**And** 显示提供商: OpenAI
**And** 显示提示词模板名称
**And** 显示功能特性Tag列表(项目需求分析、模块结构生成、复杂度评估)
**And** 显示生成模块数量: XX个模块
**And** 显示使用时间

### AC7: 工作量评估AI使用情况展示
**Given** 用户对模块使用了AI工作量评估
**When** aiUsageInfo.workloadEvaluation数组不为空
**Then** 在详情区域显示工作量评估AI使用卡片
**And** 标题显示: ⚡ 工作量评估环节
**And** 显示模型信息和提供商
**And** 显示提示词模板名称
**And** 显示评估模块数量: 已评估XX个模块
**And** 展开显示每个评估模块的详细信息
**And** 每个模块显示: 模块路径(module1/module2/module3)
**And** 每个模块显示: 评估的角色列表(Tag)
**And** 每个模块显示: 评估时间

### AC8: AI使用详情的可视化展示
**Given** AI使用面板已展示
**When** 用户查看各环节信息
**Then** 每个环节使用独立的ai-usage-item卡片
**And** 卡片包含usage-header区域(图标+标题+模型信息)
**And** 卡片包含usage-features区域(功能特性Tag列表)
**And** 卡片包含usage-details区域(详细信息)
**And** 使用不同颜色的Tag区分功能类型
**And** 使用Progress组件展示置信度

### AC9: 工作量评估模块列表展示
**Given** 存在多个AI评估的模块
**When** 用户查看工作量评估环节
**Then** 显示workload-evaluation-list
**And** 每个模块显示为evaluation-item
**And** 左侧显示ThunderboltOutlined图标
**And** 中间显示模块完整路径
**And** 显示评估角色的Tag列表
**And** 右侧显示评估时间(相对时间格式)
**And** 列表最多显示10个,超过则显示"查看更多"

### AC10: 透明性说明
**Given** AI使用面板已展示
**When** 用户查看面板底部
**Then** 显示Alert信息框
**And** 类型为info
**And** 图标为InfoCircleOutlined
**And** 消息文本: "以上AI辅助记录确保评估过程的透明性和可追溯性。所有AI建议仅供参考，最终决策由评估人员确认。"
**And** 可关闭

### AC11: 数据持久化检查
**Given** 用户在各步骤使用了AI功能
**When** 系统保存评估数据
**Then** assessmentData包含ai_assessment_result字段(如使用)
**And** assessmentData包含ai_module_analysis字段(如使用)
**And** 每个模块记录包含ai_evaluation_result字段(如使用)
**And** 所有字段包含完整的追溯信息

### AC12: 评估报告导出集成
**Given** 用户在总览页面
**When** 用户点击"导出评估报告"按钮
**Then** 系统调用generateAssessmentReport函数
**And** 报告包含ai_usage_section部分
**And** AI使用情况以结构化方式包含在报告中
**And** 报告清晰标注哪些环节使用了AI
**And** 报告包含模型名称、提示词和时间戳

### AC13: 响应式设计
**Given** 用户在不同设备上查看
**When** 屏幕宽度小于768px
**Then** AI使用概况垂直排列
**And** 统计卡片堆叠显示
**And** 模块列表项垂直排列
**And** Tag列表自动换行
**And** 确保内容可读性

### AC14: 样式和视觉设计
**Given** AI使用面板已渲染
**When** 用户查看面板
**Then** 面板具有特殊的渐变背景(蓝色系)
**And** 边框为2px solid #e6f7ff
**And** 卡片具有圆角和阴影效果
**And** 使用情况统计使用白色背景卡片
**And** Tag使用不同颜色(功能类型:blue, 角色:green)
**And** 时间信息使用灰色文本
**And** 整体风格与评估系统一致

## Tasks / Subtasks

### Task 1: 修改Overview组件添加AI使用状态 (AC: 1, 2)
- [ ] 1.1 打开 `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`
- [ ] 1.2 导入必要的React hooks: useState, useEffect
- [ ] 1.3 定义AIUsageInfo接口
- [ ] 1.4 添加aiUsageInfo状态: useState<AIUsageInfo>
- [ ] 1.5 初始状态包含: riskAssessment, moduleAnalysis, workloadEvaluation, timestamp
- [ ] 1.6 创建useEffect钩子,依赖assessmentData
- [ ] 1.7 在useEffect中调用collectAIUsageInfo

### Task 2: 实现AI使用情况收集逻辑 (AC: 2, 11)
- [ ] 2.1 创建collectAIUsageInfo函数
- [ ] 2.2 初始化usageInfo对象
- [ ] 2.3 检查assessmentData.ai_assessment_result
- [ ] 2.4 如存在,提取风险评估AI使用信息
- [ ] 2.5 包含: used, modelName, modelProvider, promptTemplate, features, confidence, usageTime
- [ ] 2.6 检查assessmentData.ai_module_analysis
- [ ] 2.7 如存在,提取模块分析AI使用信息
- [ ] 2.8 包含: used, modelName, promptTemplate, modulesGenerated, usageTime
- [ ] 2.9 遍历assessmentData.development_workload
- [ ] 2.10 对每个模块检查ai_evaluation_result
- [ ] 2.11 如存在,添加到workloadEvaluation数组
- [ ] 2.12 同样遍历integration_workload
- [ ] 2.13 设置当前时间戳
- [ ] 2.14 调用setAiUsageInfo更新状态

### Task 3: 创建AIModelUsagePanel组件 (AC: 3, 4)
- [ ] 3.1 创建 `frontend/ppa_frontend/src/pages/Assessment/components/AIModelUsagePanel.tsx`
- [ ] 3.2 定义Props接口: aiUsageInfo
- [ ] 3.3 从aiUsageInfo解构各字段
- [ ] 3.4 计算totalAiUsage
- [ ] 3.5 实现未使用AI的空状态渲染
- [ ] 3.6 返回Card,className="ai-usage-empty"
- [ ] 3.7 显示绿色InfoCircleOutlined和提示文本
- [ ] 3.8 实现使用了AI的完整面板渲染
- [ ] 3.9 返回Card,className="ai-usage-panel"

### Task 4: 实现AI使用概况统计 (AC: 4)
- [ ] 4.1 在AIModelUsagePanel中创建ai-usage-summary div
- [ ] 4.2 创建usage-stats区域
- [ ] 4.3 添加Statistic组件
- [ ] 4.4 title="AI辅助环节", value=totalAiUsage
- [ ] 4.5 prefix=<RobotOutlined style={{color: '#1890ff'}} />
- [ ] 4.6 suffix="个环节"
- [ ] 4.7 创建usage-time区域
- [ ] 4.8 显示ClockCircleOutlined图标
- [ ] 4.9 格式化timestamp: new Date(timestamp).toLocaleString('zh-CN')
- [ ] 4.10 使用flexbox布局使两个区域水平分布

### Task 5: 实现风险评估AI使用卡片 (AC: 5)
- [ ] 5.1 在ai-usage-details区域条件渲染riskAssessment
- [ ] 5.2 创建ai-usage-item div
- [ ] 5.3 添加usage-header: 图标(SafetyOutlined) + 标题"📊 风险评估环节"
- [ ] 5.4 显示模型信息: {riskAssessment.modelName}
- [ ] 5.5 显示提供商Tag: {riskAssessment.modelProvider}
- [ ] 5.6 添加usage-features区域
- [ ] 5.7 遍历riskAssessment.features显示Tag
- [ ] 5.8 Tag color="blue"
- [ ] 5.9 添加usage-details区域
- [ ] 5.10 显示Descriptions: 提示词模板、置信度、使用时间
- [ ] 5.11 使用Progress显示confidence百分比

### Task 6: 实现模块分析AI使用卡片 (AC: 6)
- [ ] 6.1 条件渲染moduleAnalysis
- [ ] 6.2 创建ai-usage-item div
- [ ] 6.3 添加usage-header: 图标(AppstoreOutlined) + 标题"🧩 模块梳理环节"
- [ ] 6.4 显示模型信息和提供商
- [ ] 6.5 添加usage-features区域显示功能Tag
- [ ] 6.6 添加usage-details区域
- [ ] 6.7 显示Descriptions: 提示词模板、生成模块数、使用时间
- [ ] 6.8 使用Statistic显示modulesGenerated,suffix="个模块"

### Task 7: 实现工作量评估AI使用卡片 (AC: 7, 9)
- [ ] 7.1 条件渲染workloadEvaluation.length > 0
- [ ] 7.2 创建ai-usage-item div
- [ ] 7.3 添加usage-header: 图标(ThunderboltOutlined) + 标题"⚡ 工作量评估环节"
- [ ] 7.4 显示模型信息和提供商
- [ ] 7.5 显示评估模块总数
- [ ] 7.6 创建workload-evaluation-list
- [ ] 7.7 遍历workloadEvaluation数组
- [ ] 7.8 对每个item创建evaluation-item
- [ ] 7.9 显示ThunderboltOutlined图标
- [ ] 7.10 显示模块路径: {item.modulePath}
- [ ] 7.11 显示评估角色Tag列表(color="green")
- [ ] 7.12 显示评估时间(使用moment相对时间)
- [ ] 7.13 限制显示数量,添加"查看更多"链接

### Task 8: 添加透明性说明 (AC: 10)
- [ ] 8.1 在ai-usage-footer区域添加Alert
- [ ] 8.2 type="info"
- [ ] 8.3 icon=<InfoCircleOutlined />
- [ ] 8.4 message="以上AI辅助记录确保评估过程的透明性和可追溯性。所有AI建议仅供参考，最终决策由评估人员确认。"
- [ ] 8.5 closable=true
- [ ] 8.6 showIcon=true

### Task 9: 在Overview中集成AIModelUsagePanel (AC: 1)
- [ ] 9.1 在Overview.tsx中导入AIModelUsagePanel
- [ ] 9.2 在总览内容下方添加ai-usage-annotation div
- [ ] 9.3 渲染<AIModelUsagePanel aiUsageInfo={aiUsageInfo} />
- [ ] 9.4 确保在form-actions之前显示
- [ ] 9.5 添加marginTop样式分隔

### Task 10: 创建样式文件 (AC: 14)
- [ ] 10.1 创建 `frontend/ppa_frontend/src/pages/Assessment/components/AIModelUsagePanel.less`
- [ ] 10.2 添加.ai-usage-annotation样式: margin-top: 24px
- [ ] 10.3 添加.ai-usage-panel样式: 边框、圆角、渐变背景
- [ ] 10.4 添加.ai-usage-empty样式: 绿色边框和背景
- [ ] 10.5 添加.ai-usage-summary样式: flexbox布局、白色背景、阴影
- [ ] 10.6 添加.usage-stats和.usage-time样式
- [ ] 10.7 添加.ai-usage-details样式
- [ ] 10.8 添加.ai-usage-item样式: 白色背景、圆角、边框、阴影
- [ ] 10.9 添加.usage-header样式: flex布局
- [ ] 10.10 添加.usage-icon样式: 字体大小、颜色、间距
- [ ] 10.11 添加.usage-info样式
- [ ] 10.12 添加.usage-features样式: flex、换行、间距
- [ ] 10.13 添加.usage-details样式: 背景色、内边距、圆角
- [ ] 10.14 添加.workload-evaluation-list和.evaluation-item样式
- [ ] 10.15 添加.evaluation-module、.module-name、.evaluation-features、.evaluation-time样式
- [ ] 10.16 添加.ai-usage-footer样式
- [ ] 10.17 添加.no-ai-usage样式
- [ ] 10.18 在Overview.tsx中导入样式

### Task 11: 实现响应式设计 (AC: 13)
- [ ] 11.1 添加@media (max-width: 768px)查询
- [ ] 11.2 .ai-usage-summary改为垂直布局
- [ ] 11.3 .usage-stats改为垂直布局
- [ ] 11.4 .usage-header改为垂直布局
- [ ] 11.5 .usage-features设置max-width: 100%
- [ ] 11.6 .evaluation-item改为垂直布局
- [ ] 11.7 确保移动端可读性

### Task 12: 集成评估报告导出 (AC: 12)
- [ ] 12.1 打开或创建 `frontend/ppa_frontend/src/utils/reportGenerator.ts`
- [ ] 12.2 修改generateAssessmentReport函数
- [ ] 12.3 添加ai_usage_section到报告结构
- [ ] 12.4 创建generateAIUsageSection函数
- [ ] 12.5 从assessmentData提取AI使用信息
- [ ] 12.6 格式化风险评估使用情况
- [ ] 12.7 格式化模块分析使用情况
- [ ] 12.8 统计并格式化工作量评估使用情况
- [ ] 12.9 返回结构化的AI使用部分
- [ ] 12.10 在Overview中集成导出功能
- [ ] 12.11 添加"导出评估报告"按钮
- [ ] 12.12 实现handleExportReport函数
- [ ] 12.13 调用报告生成并下载

### Task 13: 数据结构类型定义 (AC: 2, 11)
- [ ] 13.1 创建或修改types文件定义AIUsageInfo接口
- [ ] 13.2 定义RiskAssessmentAIInfo接口
- [ ] 13.3 定义ModuleAnalysisAIInfo接口
- [ ] 13.4 定义WorkloadEvaluationAIInfo接口
- [ ] 13.5 确保与后端数据结构一致
- [ ] 13.6 添加到统一的types导出

### Task 14: 测试 (AC: 1-14)
- [ ] 14.1 测试未使用AI时的空状态显示
- [ ] 14.2 测试仅使用风险评估AI
- [ ] 14.3 测试仅使用模块分析AI
- [ ] 14.4 测试仅使用工作量评估AI
- [ ] 14.5 测试使用所有AI功能
- [ ] 14.6 测试AI使用信息的准确性
- [ ] 14.7 测试时间戳显示正确
- [ ] 14.8 测试置信度显示
- [ ] 14.9 测试模块列表显示
- [ ] 14.10 测试响应式布局
- [ ] 14.11 测试评估报告导出包含AI信息
- [ ] 14.12 测试样式和视觉效果

## Dev Notes

### 技术栈
- **前端框架**: UMI Max + React + TypeScript
- **UI组件**: Ant Design (Card, Statistic, Descriptions, Tag, Alert, Progress)
- **样式**: Less

### 组件层次
```
Overview.tsx
├── [状态] aiUsageInfo
├── [effect] collectAIUsageInfo
├── 总览内容区域
├── AIModelUsagePanel.tsx (新组件)
│   ├── 未使用AI: 空状态Card
│   ├── 使用了AI: 完整面板
│   │   ├── AI使用概况统计
│   │   ├── 风险评估AI使用卡片
│   │   ├── 模块分析AI使用卡片
│   │   ├── 工作量评估AI使用卡片
│   │   │   └── 评估模块列表
│   │   └── 透明性说明Alert
└── 操作按钮区域
```

### 文件路径
- 新组件: `frontend/ppa_frontend/src/pages/Assessment/components/AIModelUsagePanel.tsx`
- 新样式: `frontend/ppa_frontend/src/pages/Assessment/components/AIModelUsagePanel.less`
- 修改: `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`
- 工具函数: `frontend/ppa_frontend/src/utils/reportGenerator.ts`
- 类型定义: `frontend/ppa_frontend/src/types/assessment.ts` (或新建)

### 数据结构

#### AI使用信息汇总
```typescript
interface AIUsageInfo {
  riskAssessment: RiskAssessmentAIInfo | null;
  moduleAnalysis: ModuleAnalysisAIInfo | null;
  workloadEvaluation: WorkloadEvaluationAIInfo[];
  timestamp: string;
}

interface RiskAssessmentAIInfo {
  used: boolean;
  modelName: string;
  modelProvider: string;
  promptTemplate: string;
  features: string[];
  confidence: number;
  usageTime: string;
}

interface ModuleAnalysisAIInfo {
  used: boolean;
  modelName: string;
  modelProvider: string;
  promptTemplate: string;
  features: string[];
  modulesGenerated: number;
  usageTime: string;
}

interface WorkloadEvaluationAIInfo {
  moduleType: 'development' | 'integration';
  modulePath: string;
  moduleId: string;
  modelName: string;
  promptTemplate: string;
  evaluatedRoles: string[];
  usageTime: string;
}
```

#### 评估数据中的AI记录
```typescript
interface AssessmentData {
  // ... 其他字段
  ai_assessment_result?: {
    risk_scores: any[];
    missing_risks: any[];
    overall_suggestion: string;
    prompt_name: string;
    confidence: number;
    timestamp: string;
    model_info: {
      model_name: string;
      model_provider: string;
      api_key_source: string;
    };
  };
  ai_module_analysis?: {
    modules_count: number;
    prompt_name: string;
    timestamp: string;
    model_info: {
      model_name: string;
      model_provider: string;
      api_key_source: string;
    };
  };
  development_workload?: WorkloadRecord[];
  integration_workload?: WorkloadRecord[];
}

interface WorkloadRecord {
  // ... 其他字段
  ai_evaluation_result?: {
    used: boolean;
    modelName: string;
    modelProvider: string;
    promptTemplate: string;
    evaluatedRoles: string[];
    timestamp: string;
    confidence?: number;
  };
}
```

### 收集逻辑示例
```typescript
const collectAIUsageInfo = () => {
  const usageInfo: AIUsageInfo = {
    riskAssessment: null,
    moduleAnalysis: null,
    workloadEvaluation: [],
    timestamp: new Date().toISOString()
  };
  
  // 收集风险评估AI使用
  if (assessmentData.ai_assessment_result) {
    usageInfo.riskAssessment = {
      used: true,
      modelName: assessmentData.ai_assessment_result.model_info.model_name,
      modelProvider: assessmentData.ai_assessment_result.model_info.model_provider,
      promptTemplate: assessmentData.ai_assessment_result.prompt_name,
      features: ['风险项评分建议', '缺失风险项识别', '总体建议'],
      confidence: assessmentData.ai_assessment_result.confidence,
      usageTime: assessmentData.ai_assessment_result.timestamp
    };
  }
  
  // 收集模块分析AI使用
  if (assessmentData.ai_module_analysis) {
    usageInfo.moduleAnalysis = {
      used: true,
      modelName: assessmentData.ai_module_analysis.model_info.model_name,
      modelProvider: assessmentData.ai_module_analysis.model_info.model_provider,
      promptTemplate: assessmentData.ai_module_analysis.prompt_name,
      features: ['项目需求分析', '模块结构生成', '复杂度评估'],
      modulesGenerated: assessmentData.ai_module_analysis.modules_count,
      usageTime: assessmentData.ai_module_analysis.timestamp
    };
  }
  
  // 收集工作量评估AI使用
  assessmentData.development_workload?.forEach(module => {
    if (module.ai_evaluation_result) {
      usageInfo.workloadEvaluation.push({
        moduleType: 'development',
        modulePath: `${module.module1}/${module.module2}/${module.module3}`,
        moduleId: module.id,
        modelName: module.ai_evaluation_result.modelName,
        promptTemplate: module.ai_evaluation_result.promptTemplate,
        evaluatedRoles: module.ai_evaluation_result.evaluatedRoles,
        usageTime: module.ai_evaluation_result.timestamp
      });
    }
  });
  
  // 同样处理integration_workload...
  
  setAiUsageInfo(usageInfo);
};
```

### 样式要点
```less
.ai-usage-panel {
  border: 2px solid #e6f7ff;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  
  .ai-usage-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .ai-usage-item {
    margin-bottom: 24px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    border: 1px solid #e8e8e8;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}
```

### 设计参考
- 文档: `docs/new-assessment-ai-design-step4.md`
- 用户故事: `docs/stories/ai_feature_user_stories.md` (Story 4)

### 注意事项
1. **数据准确性**: 确保从assessmentData正确提取AI使用信息
2. **时间格式**: 统一使用ISO 8601格式存储,显示时本地化
3. **空状态处理**: 优雅处理未使用AI的情况
4. **可视化**: 使用合适的图标、颜色和布局增强可读性
5. **追溯性**: 确保所有AI使用记录完整且可追溯
6. **报告集成**: 导出的报告必须包含AI使用情况
7. **性能**: 避免重复计算,使用useMemo优化
8. **响应式**: 确保移动端良好体验

### Testing Strategy
- 测试各种AI使用组合场景
- 测试空状态和完整状态渲染
- 测试数据收集的准确性
- 测试时间显示的正确性
- 测试评估报告导出
- 测试响应式布局
- 测试样式和视觉效果

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
| 1.0 | 2025-11-09 | 初始创建 - AI使用情况标注与追溯功能 | Bob (SM) |
