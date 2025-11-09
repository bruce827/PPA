# 新建评估页面 - AI模型使用情况标注功能设计

## 功能概述

在新建评估页面的第四步（生成总览步骤）中集成AI模型使用情况标注功能，自动识别和展示在评估过程中使用的AI模型信息。

## 核心功能

### 第四步：AI模型使用情况标注

## 详细设计

### 1. 功能位置和设计

#### 在Overview组件中添加AI模型标注区域
```jsx
// pages/Assessment/components/Overview.tsx 增强
const Overview = ({ assessmentData, configData, onPrev }) => {
  const [aiUsageInfo, setAiUsageInfo] = useState({
    riskAssessment: null,
    moduleAnalysis: null,
    workloadEvaluation: [],
    timestamp: new Date().toISOString()
  });
  
  useEffect(() => {
    // 收集AI使用情况信息
    collectAIUsageInfo();
  }, [assessmentData]);
  
  const collectAIUsageInfo = () => {
    const usageInfo = {
      riskAssessment: null,
      moduleAnalysis: null,
      workloadEvaluation: [],
      timestamp: new Date().toISOString()
    };
    
    // 检查风险评估AI使用情况
    if (assessmentData.ai_assessment_result) {
      usageInfo.riskAssessment = {
        used: true,
        modelName: 'GPT-4 (来自模型配置)',
        modelProvider: 'OpenAI',
        promptTemplate: assessmentData.ai_assessment_result.prompt_name || '风险评估模板',
        features: ['风险项评分建议', '缺失风险项识别', '总体建议'],
        confidence: assessmentData.ai_assessment_result.confidence || 0.8,
        usageTime: assessmentData.ai_assessment_result.timestamp
      };
    }
    
    // 检查模块分析AI使用情况
    if (assessmentData.ai_module_analysis) {
      usageInfo.moduleAnalysis = {
        used: true,
        modelName: 'GPT-4 (来自模型配置)',
        modelProvider: 'OpenAI',
        promptTemplate: assessmentData.ai_module_analysis.prompt_name || '模块分析模板',
        features: ['项目需求分析', '模块结构生成', '复杂度评估'],
        modulesGenerated: assessmentData.ai_module_analysis.modules_count || 0,
        usageTime: assessmentData.ai_module_analysis.timestamp
      };
    }
    
    // 检查工作量评估AI使用情况
    const evaluatedModules = [];
    if (assessmentData.development_workload) {
      assessmentData.development_workload.forEach((module, index) => {
        if (module.ai_evaluation_result) {
          evaluatedModules.push({
            module: `${module.module1} - ${module.module2} - ${module.module3}`,
            type: '新功能开发',
            modelName: 'GPT-4 (来自模型配置)',
            modelProvider: 'OpenAI',
            features: ['角色工作量评估', '成本估算'],
            evaluationTime: module.ai_evaluation_result.timestamp
          });
        }
      });
    }
    
    if (assessmentData.integration_workload) {
      assessmentData.integration_workload.forEach((module, index) => {
        if (module.ai_evaluation_result) {
          evaluatedModules.push({
            module: `${module.module1} - ${module.module2} - ${module.module3}`,
            type: '系统对接',
            modelName: 'GPT-4 (来自模型配置)',
            modelProvider: 'OpenAI',
            features: ['角色工作量评估', '成本估算'],
            evaluationTime: module.ai_evaluation_result.timestamp
          });
        }
      });
    }
    
    usageInfo.workloadEvaluation = evaluatedModules;
    setAiUsageInfo(usageInfo);
  };
  
  return (
    <div className="assessment-overview">
      {/* 原有总览内容 */}
      <div className="overview-content">
        {/* 现有Overview组件内容... */}
      </div>
      
      {/* AI模型使用情况标注区域 */}
      <div className="ai-usage-annotation">
        <AIModelUsagePanel aiUsageInfo={aiUsageInfo} />
      </div>
      
      {/* 继续按钮 */}
      <div className="form-actions" style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={onPrev}>上一步</Button>
          <Button type="primary" size="large">
            完成评估并保存
          </Button>
        </Space>
      </div>
    </div>
  );
};
```

### 2. AI模型使用情况展示面板

```jsx
// AIModelUsagePanel.jsx
const AIModelUsagePanel = ({ aiUsageInfo }) => {
  const { riskAssessment, moduleAnalysis, workloadEvaluation, timestamp } = aiUsageInfo;
  
  const totalAiUsage = [
    riskAssessment,
    moduleAnalysis,
    ...workloadEvaluation
  ].filter(item => item && item.used).length;
  
  if (totalAiUsage === 0) {
    return (
      <Card 
        title="🤖 AI模型使用情况" 
        className="ai-usage-empty"
        size="small"
      >
        <div className="no-ai-usage">
          <InfoCircleOutlined style={{ color: '#52c41a', fontSize: '24px', marginRight: '8px' }} />
          <span>本次评估未使用AI辅助功能，所有数据均来自手动输入</span>
        </div>
      </Card>
    );
  }
  
  return (
    <Card 
      title="🤖 AI模型使用情况" 
      className="ai-usage-panel"
      size="small"
    >
      <div className="ai-usage-summary">
        <div className="usage-stats">
          <Statistic 
            title="AI辅助环节" 
            value={totalAiUsage} 
            suffix="个"
            valueStyle={{ color: '#1890ff' }}
          />
          <Statistic 
            title="模型调用次数" 
            value={workloadEvaluation.length + (riskAssessment ? 1 : 0) + (moduleAnalysis ? 1 : 0)} 
            suffix="次"
            valueStyle={{ color: '#52c41a' }}
          />
        </div>
        <div className="usage-time">
          <ClockCircleOutlined style={{ marginRight: '4px' }} />
          最后更新: {new Date(timestamp).toLocaleString('zh-CN')}
        </div>
      </div>
      
      <div className="ai-usage-details">
        {/* 风险评估AI使用情况 */}
        {riskAssessment && (
          <div className="ai-usage-item">
            <div className="usage-header">
              <div className="usage-icon">
                <SafetyOutlined />
              </div>
              <div className="usage-info">
                <h4>风险评估环节AI辅助</h4>
                <div className="usage-model">
                  <Tag color="blue">{riskAssessment.modelName}</Tag>
                  <Tag color="green">{riskAssessment.modelProvider}</Tag>
                </div>
              </div>
              <div className="usage-features">
                {riskAssessment.features.map(feature => (
                  <Tag key={feature} color="orange" size="small">{feature}</Tag>
                ))}
              </div>
            </div>
            <div className="usage-details">
              <Row gutter={16}>
                <Col span={8}>
                  <Descriptions.Item label="提示词模板">
                    {riskAssessment.promptTemplate}
                  </Descriptions.Item>
                </Col>
                <Col span={8}>
                  <Descriptions.Item label="置信度">
                    <Progress 
                      percent={Math.round(riskAssessment.confidence * 100)} 
                      size="small" 
                      style={{ width: '100px' }}
                    />
                  </Descriptions.Item>
                </Col>
                <Col span={8}>
                  <Descriptions.Item label="使用时间">
                    {new Date(riskAssessment.usageTime).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                </Col>
              </Row>
            </div>
          </div>
        )}
        
        {/* 模块分析AI使用情况 */}
        {moduleAnalysis && (
          <div className="ai-usage-item">
            <div className="usage-header">
              <div className="usage-icon">
                <SearchOutlined />
              </div>
              <div className="usage-info">
                <h4>模块分析环节AI辅助</h4>
                <div className="usage-model">
                  <Tag color="blue">{moduleAnalysis.modelName}</Tag>
                  <Tag color="green">{moduleAnalysis.modelProvider}</Tag>
                </div>
              </div>
              <div className="usage-features">
                {moduleAnalysis.features.map(feature => (
                  <Tag key={feature} color="purple" size="small">{feature}</Tag>
                ))}
              </div>
            </div>
            <div className="usage-details">
              <Row gutter={16}>
                <Col span={8}>
                  <Descriptions.Item label="提示词模板">
                    {moduleAnalysis.promptTemplate}
                  </Descriptions.Item>
                </Col>
                <Col span={8}>
                  <Descriptions.Item label="生成模块数">
                    <span style={{ color: '#1890ff', fontWeight: 500 }}>
                      {moduleAnalysis.modulesGenerated} 个
                    </span>
                  </Descriptions.Item>
                </Col>
                <Col span={8}>
                  <Descriptions.Item label="使用时间">
                    {new Date(moduleAnalysis.usageTime).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                </Col>
              </Row>
            </div>
          </div>
        )}
        
        {/* 工作量评估AI使用情况 */}
        {workloadEvaluation.length > 0 && (
          <div className="ai-usage-item">
            <div className="usage-header">
              <div className="usage-icon">
                <CalculatorOutlined />
              </div>
              <div className="usage-info">
                <h4>工作量评估环节AI辅助</h4>
                <div className="usage-model">
                  <Tag color="blue">{workloadEvaluation[0].modelName}</Tag>
                  <Tag color="green">{workloadEvaluation[0].modelProvider}</Tag>
                </div>
              </div>
              <div className="usage-summary">
                <Tag color="cyan">共评估 {workloadEvaluation.length} 个模块</Tag>
              </div>
            </div>
            
            <div className="workload-evaluation-list">
              {workloadEvaluation.map((evaluation, index) => (
                <div key={index} className="evaluation-item">
                  <div className="evaluation-module">
                    <Tag color="blue" size="small">{evaluation.type}</Tag>
                    <span className="module-name">{evaluation.module}</span>
                  </div>
                  <div className="evaluation-features">
                    {evaluation.features.map(feature => (
                      <Tag key={feature} size="small" color="gold">{feature}</Tag>
                    ))}
                  </div>
                  <div className="evaluation-time">
                    {new Date(evaluation.evaluationTime).toLocaleString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="ai-usage-footer">
        <Alert
          message="AI使用说明"
          description="以上显示了在评估过程中使用AI辅助的各个环节和模型信息。所有AI功能均基于您在模型配置中设置的API密钥和提示词模板。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </div>
    </Card>
  );
};
```

### 3. 数据收集和存储逻辑

#### 在每个AI功能使用后记录信息
```javascript
// 在New.tsx中处理AI评估结果时记录使用情况
const handleAIAssessmentComplete = (assessmentResult) => {
  const { risk_scores, missing_risks, overall_suggestion } = assessmentResult;
  
  // 更新表单数据
  const updatedValues = { ...assessmentData };
  
  // 应用风险项评分
  risk_scores.forEach(score => {
    updatedValues[score.item_name] = score.suggested_score;
  });
  
  // 记录AI使用情况
  updatedValues.ai_assessment_result = {
    risk_scores,
    missing_risks,
    overall_suggestion,
    prompt_name: selectedPrompt?.name || '风险评估模板',
    confidence: assessmentResult.confidence || 0.8,
    timestamp: new Date().toISOString(),
    model_info: {
      model_name: 'GPT-4 (来自模型配置)',
      model_provider: 'OpenAI',
      api_key_source: '模型配置模块'
    }
  };
  
  setAssessmentData(updatedValues);
  form.setFieldsValue(updatedValues);
  message.success('AI评估结果已应用到风险评分表单');
};

// 处理模块生成时的AI使用记录
const handleAIGeneration = async (type, modules) => {
  setAiLoading(true);
  try {
    if (type === 'dev') {
      handleDevChange([...devWorkload, ...modules]);
    } else {
      handleIntegrationChange([...integrationWorkload, ...modules]);
    }
    
    // 记录模块分析AI使用情况
    const moduleAnalysisInfo = {
      modules_count: modules.length,
      prompt_name: selectedPrompt?.name || '模块分析模板',
      timestamp: new Date().toISOString(),
      model_info: {
        model_name: 'GPT-4 (来自模型配置)',
        model_provider: 'OpenAI',
        api_key_source: '模型配置模块'
      }
    };
    
    // 更新到评估数据中
    setAssessmentData(prev => ({
      ...prev,
      ai_module_analysis: moduleAnalysisInfo
    }));
    
    message.success(`成功生成 ${modules.length} 个${type === 'dev' ? '新功能' : '对接'}模块`);
  } catch (error) {
    message.error('AI生成失败，请重试');
  } finally {
    setAiLoading(false);
  }
};

// 处理工作量评估时的AI使用记录
const handleSingleEvaluation = async (record) => {
  setEvaluationLoading(true);
  setCurrentEvaluatedRecord(record);
  
  try {
    const result = await aiService.evaluateWorkload({
      module1: record.module1,
      module2: record.module2,
      module3: record.module3,
      description: record.description,
      template: 'workload_evaluation'
    });
    
    if (result.success) {
      setEvaluationResult(result.data);
      setEvaluationModalVisible(true);
      
      // 记录AI评估使用情况到模块中
      const updatedRecord = {
        ...record,
        ai_evaluation_result: {
          evaluation_result: result.data,
          timestamp: new Date().toISOString(),
          model_info: {
            model_name: 'GPT-4 (来自模型配置)',
            model_provider: 'OpenAI',
            api_key_source: '模型配置模块'
          }
        }
      };
      
      // 更新模块数据
      const updatedList = devWorkload.map(item => 
        item.id === record.id ? updatedRecord : item
      );
      handleDevChange(updatedList);
    }
  } catch (error) {
    message.error('工作量评估失败，请重试');
  } finally {
    setEvaluationLoading(false);
  }
};
```

### 4. 评估报告导出中的AI使用情况

#### 在生成评估报告时包含AI使用信息
```javascript
// utils/reportGenerator.js
const generateAssessmentReport = (assessmentData, configData) => {
  const report = {
    // ... 其他报告内容
    ai_usage_section: {
      title: "AI模型使用情况",
      content: generateAIUsageSection(assessmentData),
      timestamp: new Date().toISOString()
    }
  };
  
  return report;
};

const generateAIUsageSection = (assessmentData) => {
  const sections = [];
  
  if (assessmentData.ai_assessment_result) {
    sections.push({
      section: "风险评估环节",
      model: "GPT-4",
      provider: "OpenAI",
      features: assessmentData.ai_assessment_result.features || [],
      confidence: assessmentData.ai_assessment_result.confidence
    });
  }
  
  if (assessmentData.ai_module_analysis) {
    sections.push({
      section: "模块分析环节",
      model: "GPT-4",
      provider: "OpenAI",
      features: ["项目需求分析", "模块结构生成"],
      modules_generated: assessmentData.ai_module_analysis.modules_count
    });
  }
  
  // 统计工作量评估使用情况
  const workloadEvaluations = [];
  if (assessmentData.development_workload) {
    assessmentData.development_workload.forEach(module => {
      if (module.ai_evaluation_result) {
        workloadEvaluations.push({
          module: `${module.module1} - ${module.module2}`,
          type: "新功能开发"
        });
      }
    });
  }
  
  if (workloadEvaluations.length > 0) {
    sections.push({
      section: "工作量评估环节",
      model: "GPT-4",
      provider: "OpenAI",
      features: ["角色工作量评估", "成本估算"],
      evaluated_modules: workloadEvaluations.length
    });
  }
  
  return sections;
};
```

### 5. 界面样式设计

```css
.ai-usage-annotation {
  margin-top: 24px;
}

.ai-usage-panel {
  border: 2px solid #e6f7ff;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
}

.ai-usage-empty {
  border: 2px solid #f6ffed;
  background: #f6ffed;
}

.ai-usage-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.usage-stats {
  display: flex;
  gap: 32px;
}

.usage-time {
  color: #666;
  font-size: 14px;
}

.ai-usage-details {
  margin-top: 16px;
}

.ai-usage-item {
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.usage-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.usage-icon {
  font-size: 24px;
  color: #1890ff;
  margin-right: 16px;
}

.usage-info {
  flex: 1;
}

.usage-info h4 {
  margin: 0 0 8px 0;
  color: #1890ff;
  font-size: 16px;
}

.usage-model {
  display: flex;
  gap: 8px;
}

.usage-features {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 300px;
}

.usage-details {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 12px;
}

.workload-evaluation-list {
  margin-top: 16px;
}

.evaluation-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 8px;
}

.evaluation-module {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-name {
  font-weight: 500;
  color: #333;
}

.evaluation-features {
  display: flex;
  gap: 4px;
  margin-right: 16px;
}

.evaluation-time {
  color: #666;
  font-size: 12px;
  white-space: nowrap;
}

.ai-usage-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
}

.no-ai-usage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #52c41a;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-usage-summary {
    flex-direction: column;
    gap: 16px;
  }
  
  .usage-stats {
    flex-direction: column;
    gap: 16px;
  }
  
  .usage-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .usage-features {
    max-width: 100%;
  }
  
  .evaluation-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
```

### 6. 导出功能集成

#### 在Overview组件中添加导出功能
```jsx
// 在Overview.tsx中添加
const handleExportReport = async () => {
  try {
    const reportData = {
      assessmentData,
      configData,
      aiUsageInfo,
      exportTime: new Date().toISOString()
    };
    
    // 生成包含AI使用情况的完整报告
    const report = await generateAssessmentReport(reportData);
    
    // 下载报告
    downloadReport(report, `项目评估报告_${new Date().toISOString().split('T')[0]}.pdf`);
    
    message.success('评估报告导出成功');
  } catch (error) {
    message.error('报告导出失败，请重试');
  }
};

// 在Overview组件的render中
return (
  <div className="assessment-overview">
    {/* 现有内容 */}
    <div className="overview-content">
      {/* ... 现有Overview内容 */}
    </div>
    
    {/* AI使用情况标注 */}
    <div className="ai-usage-annotation">
      <AIModelUsagePanel aiUsageInfo={aiUsageInfo} />
    </div>
    
    {/* 操作按钮 */}
    <div className="form-actions" style={{ marginTop: 24, textAlign: 'right' }}>
      <Space>
        <Button onClick={onPrev}>上一步</Button>
        <Button 
          type="default" 
          icon={<DownloadOutlined />}
          onClick={handleExportReport}
        >
          导出评估报告
        </Button>
        <Button type="primary" size="large">
          完成评估并保存
        </Button>
      </Space>
    </div>
  </div>
);
```

## 功能特点

### 1. **自动识别AI使用情况**
- 风险评估：自动检测AI评估结果
- 模块分析：识别AI生成的模块
- 工作量评估：统计AI评估的模块数量

### 2. **详细信息展示**
- 使用的AI模型名称和提供商
- 提示词模板信息
- AI功能特性列表
- 置信度评估
- 使用时间记录

### 3. **可视化展示**
- 统计卡片显示AI使用概况
- 分步骤详细展示每个AI功能
- 时间线显示AI使用历史
- 进度条显示AI评估置信度

### 4. **报告导出集成**
- 评估报告中包含AI使用情况
- 支持PDF导出
- 完整记录AI辅助过程

## 数据流程

```
AI功能使用 → 记录使用信息 → 存储到评估数据 → 第四步展示 → 报告导出
```

## 关键设计原则

1. **透明性**: 清楚展示AI使用的各个环节
2. **可追溯性**: 记录详细的使用信息和时间
3. **完整性**: 覆盖所有AI辅助功能
4. **用户友好**: 清晰的可视化展示
5. **集成性**: 与现有评估流程无缝集成

这个设计方案确保用户在第四步能够清楚看到整个评估过程中AI模型的辅助情况，满足您的需求。是否还需要调整任何部分？