# 新建评估页面 - AI一键风险评估功能设计

## 功能概述

在新建评估页面的第一步（风险评分步骤）中集成AI智能评估功能，通过分析项目招标文件或要求，自动评估风险项评分并提供专业建议。

## 核心功能

### 第一步：AI一键风险评估

## 详细设计

### 1. 界面位置和布局

#### 在RiskScoringForm组件中添加AI功能
```jsx
// pages/Assessment/components/RiskScoringForm.tsx 增强
const RiskScoringForm = ({ form, initialValues, configData, onValuesChange, onNext }) => {
  const [aiAssessmentVisible, setAiAssessmentVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptVariables, setPromptVariables] = useState({});
  
  return (
    <div className="risk-scoring-form">
      {/* 原有风险项表单 */}
      <div className="risk-items-section">
        {renderRiskItems()}
      </div>
      
      {/* AI一键评估区域 */}
      <div className="ai-assessment-section">
        <Card 
          title="🤖 AI智能风险评估" 
          extra={
            <Button 
              type="primary" 
              icon={<RobotOutlined />}
              onClick={() => setAiAssessmentVisible(true)}
              size="large"
            >
              一键AI评估
            </Button>
          }
        >
          <div className="ai-assessment-tips">
            <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            <span>上传项目招标文件，AI将自动评估风险项评分并提供专业建议</span>
          </div>
        </Card>
      </div>
      
      {/* 继续按钮 */}
      <div className="form-actions" style={{ marginTop: 24, textAlign: 'right' }}>
        <Button type="primary" onClick={onNext} size="large">
          下一步：工作量估算
        </Button>
      </div>
      
      {/* AI评估弹窗 */}
      <AIAssessmentModal
        visible={aiAssessmentVisible}
        onClose={() => setAiAssessmentVisible(false)}
        onAssessmentComplete={handleAIAssessmentComplete}
        configData={configData}
        currentAssessmentData={form.getFieldsValue()}
      />
    </div>
  );
};
```

### 2. AI评估弹窗设计

```jsx
// AIAssessmentModal.jsx
const AIAssessmentModal = ({ 
  visible, 
  onClose, 
  onAssessmentComplete, 
  configData, 
  currentAssessmentData 
}) => {
  const [projectDocument, setProjectDocument] = useState('');
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptVariables, setPromptVariables] = useState({});
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 加载可用的提示词
  useEffect(() => {
    if (visible) {
      loadAvailablePrompts();
    }
  }, [visible]);
  
  const loadAvailablePrompts = async () => {
    // 从模型配置/提示词管理模块获取提示词列表
    try {
      const result = await fetch('/api/ai/prompts'); // 假设的API
      const prompts = await result.json();
      setAvailablePrompts(prompts.data || []);
    } catch (error) {
      console.error('加载提示词失败:', error);
    }
  };
  
  const handlePromptChange = (promptId) => {
    const prompt = availablePrompts.find(p => p.id === promptId);
    setSelectedPrompt(prompt);
    
    // 根据提示词模板初始化变量
    if (prompt?.variables) {
      const defaultVariables = {};
      prompt.variables.forEach(variable => {
        defaultVariables[variable.name] = variable.default_value || '';
      });
      setPromptVariables(defaultVariables);
    }
  };
  
  const handleAssessment = async () => {
    if (!projectDocument.trim()) {
      message.warning('请输入项目文档内容');
      return;
    }
    
    if (!selectedPrompt) {
      message.warning('请选择提示词模板');
      return;
    }
    
    setLoading(true);
    try {
      const result = await aiService.assessRisk({
        document: projectDocument,
        prompt: selectedPrompt,
        variables: promptVariables,
        currentRiskItems: configData.risk_items,
        currentScores: currentAssessmentData
      });
      
      if (result.success) {
        setAssessmentResult(result.data);
        message.success('AI评估完成');
      }
    } catch (error) {
      message.error('AI评估失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApplyResult = () => {
    if (assessmentResult) {
      onAssessmentComplete(assessmentResult);
      onClose();
    }
  };
  
  return (
    <Modal
      title="🤖 AI一键风险评估"
      visible={visible}
      onOk={handleApplyResult}
      onCancel={onClose}
      width={1000}
      okText="应用评估结果"
      cancelText="取消"
      confirmLoading={loading}
    >
      <div className="ai-assessment-modal">
        {/* 项目文档输入 */}
        <div className="document-input-section">
          <h4>📄 项目文档</h4>
          <TextArea
            value={projectDocument}
            onChange={(e) => setProjectDocument(e.target.value)}
            placeholder="请输入项目招标文件内容或项目要求描述..."
            rows={8}
            showCount
            maxLength={5000}
          />
        </div>
        
        {/* 提示词选择和配置 */}
        <div className="prompt-config-section">
          <h4>⚙️ 评估配置</h4>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="选择提示词模板">
                <Select
                  value={selectedPrompt?.id}
                  onChange={handlePromptChange}
                  placeholder="请选择提示词模板"
                  style={{ width: '100%' }}
                >
                  {availablePrompts.map(prompt => (
                    <Select.Option key={prompt.id} value={prompt.id}>
                      {prompt.name} - {prompt.description}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="模型信息">
                <Input
                  value="当前使用：GPT-4 (来自模型配置)"
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          {/* 提示词变量配置 */}
          {selectedPrompt?.variables && (
            <div className="prompt-variables">
              <h5>🔧 提示词变量配置</h5>
              <Row gutter={16}>
                {selectedPrompt.variables.map(variable => (
                  <Col span={12} key={variable.name}>
                    <Form.Item
                      label={variable.display_name}
                      tooltip={variable.description}
                    >
                      <Input
                        value={promptVariables[variable.name] || ''}
                        onChange={(e) => setPromptVariables(prev => ({
                          ...prev,
                          [variable.name]: e.target.value
                        }))}
                        placeholder={variable.placeholder || ''}
                      />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
        
        {/* 评估结果 */}
        <div className="assessment-result-section">
          <h4>📊 评估结果</h4>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" tip="AI正在分析项目文档，评估风险项..." />
            </div>
          ) : assessmentResult ? (
            <div className="result-content">
              {/* 风险项评分建议 */}
              <div className="risk-scores-suggestion">
                <h5>🎯 风险项评分建议</h5>
                <Table
                  dataSource={assessmentResult.risk_scores}
                  columns={[
                    { title: '风险项', dataIndex: 'item_name', width: 200 },
                    { title: '当前评分', dataIndex: 'current_score', width: 100 },
                    { title: 'AI建议评分', dataIndex: 'suggested_score', width: 120, 
                      render: (val) => <span style={{ color: '#1890ff', fontWeight: 500 }}>{val}</span> },
                    { title: '建议理由', dataIndex: 'reason', ellipsis: true }
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
              
              {/* 缺失风险项建议 */}
              {assessmentResult.missing_risks && assessmentResult.missing_risks.length > 0 && (
                <div className="missing-risks-suggestion" style={{ marginTop: 16 }}>
                  <h5>⚠️ 可能缺失的风险项</h5>
                  <List
                    dataSource={assessmentResult.missing_risks}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.risk_name}
                          description={item.description}
                        />
                        <div>
                          <Tag color="orange">建议评分: {item.suggested_score}</Tag>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              )}
              
              {/* 总体建议 */}
              <div className="overall-suggestion" style={{ marginTop: 16 }}>
                <h5>💡 总体建议</h5>
                <Card size="small">
                  <Paragraph>{assessmentResult.overall_suggestion}</Paragraph>
                </Card>
              </div>
            </div>
          ) : (
            <div className="assessment-placeholder">
              <Button 
                type="primary" 
                size="large" 
                onClick={handleAssessment}
                icon={<PlayCircleOutlined />}
              >
                开始AI评估
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
```

### 3. 后端API设计

```javascript
// routes/ai.js
router.post('/assess-risk', async (req, res) => {
  const { document, prompt, variables, currentRiskItems, currentScores } = req.body;
  
  try {
    const result = await aiService.assessProjectRisk({
      document,
      prompt,
      variables,
      currentRiskItems,
      currentScores
    });
    
    res.json(result);
  } catch (error) {
    console.error('AI风险评估错误:', error);
    res.status(500).json({ success: false, error: '评估失败' });
  }
});

router.get('/prompts', async (req, res) => {
  try {
    // 从模型配置/提示词管理模块获取提示词列表
    const prompts = await getPromptsFromModelConfig();
    res.json({ success: true, data: prompts });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取提示词失败' });
  }
});
```

### 4. AI服务实现

```javascript
// services/aiService.js
class AIService {
  async assessProjectRisk(params) {
    const { document, prompt, variables, currentRiskItems, currentScores } = params;
    
    // 构建完整的提示词
    const fullPrompt = this.buildRiskAssessmentPrompt({
      template: prompt.content,
      variables,
      document,
      riskItems: currentRiskItems,
      currentScores
    });
    
    // 获取用户当前配置的模型
    const modelConfig = await this.getCurrentModelConfig();
    
    try {
      // 调用AI模型
      const aiResponse = await this.callModel(modelConfig, fullPrompt);
      
      // 解析AI响应
      const assessmentResult = this.parseRiskAssessmentResponse(aiResponse);
      
      return {
        success: true,
        data: assessmentResult
      };
    } catch (error) {
      console.error('AI风险评估失败:', error);
      return {
        success: false,
        error: 'AI评估失败，请检查模型配置'
      };
    }
  }
  
  buildRiskAssessmentPrompt({ template, variables, document, riskItems, currentScores }) {
    // 替换提示词模板中的变量
    let prompt = template;
    
    // 替换预定义变量
    Object.keys(variables).forEach(key => {
      prompt = prompt.replace(`{{${key}}}`, variables[key]);
    });
    
    // 添加项目文档和风险项信息
    const enhancedPrompt = `
${prompt}

=== 项目文档 ===
${document}

=== 当前风险项配置 ===
${riskItems.map(item => `- ${item.item_name}: ${item.description}`).join('\n')}

=== 当前评分 ===
${Object.entries(currentScores || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

=== 评估要求 ===
请分析项目文档，评估每个风险项的评分，并提供：
1. 每个风险项的建议评分和理由
2. 可能缺失的风险项（如果有）
3. 总体风险评估建议

请以JSON格式返回结果。
`;
    
    return enhancedPrompt;
  }
  
  parseRiskAssessmentResponse(response) {
    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(response);
      
      return {
        risk_scores: parsed.risk_scores || [],
        missing_risks: parsed.missing_risks || [],
        overall_suggestion: parsed.overall_suggestion || '无特殊建议',
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      // 如果JSON解析失败，尝试从文本中提取信息
      return this.extractAssessmentFromText(response);
    }
  }
  
  extractAssessmentFromText(text) {
    // 简单的文本解析逻辑
    // 实际实现可以根据需要更复杂
    return {
      risk_scores: [],
      missing_risks: [],
      overall_suggestion: text.substring(0, 500),
      confidence: 0.6
    };
  }
}
```

### 5. 结果应用逻辑

```javascript
// 在New.tsx中处理AI评估结果
const handleAIAssessmentComplete = (assessmentResult) => {
  const { risk_scores, missing_risks, overall_suggestion } = assessmentResult;
  
  // 更新表单数据
  const updatedValues = { ...assessmentData };
  
  // 应用风险项评分
  risk_scores.forEach(score => {
    updatedValues[score.item_name] = score.suggested_score;
  });
  
  // 添加建议文本到表单（可以存储到备注字段）
  updatedValues.ai_suggestion = overall_suggestion;
  updatedValues.missing_risks = missing_risks;
  
  setAssessmentData(updatedValues);
  form.setFieldsValue(updatedValues);
  
  message.success('AI评估结果已应用到风险评分表单');
};
```

## 功能流程

### 1. 用户操作流程
```
1. 在风险评分表单中点击"一键AI评估"按钮
2. 弹窗打开，显示文档输入区域
3. 用户输入项目招标文件或要求描述
4. 选择合适的提示词模板
5. 配置提示词中的变量
6. 点击"开始AI评估"
7. 系统调用AI模型进行分析
8. 显示评估结果（风险项评分+建议）
9. 用户确认后"应用评估结果"
10. 自动填充表单并关闭弹窗
```

### 2. 系统处理流程
```
1. 接收用户输入的文档和配置
2. 获取用户当前的模型配置和提示词
3. 构建完整的AI提示词
4. 调用用户配置的AI模型
5. 解析AI返回的评估结果
6. 格式化并返回前端
7. 前端应用结果到表单
```

## 界面样式

```css
.ai-assessment-section {
  margin-top: 24px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.ai-assessment-tips {
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.ai-assessment-modal .document-input-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.ai-assessment-modal .prompt-config-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.risk-scores-suggestion {
  background: #f6ffed;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.missing-risks-suggestion {
  background: #fff7e6;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #ffd591;
}

.overall-suggestion {
  background: #e6f7ff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #91d5ff;
}
```

## 关键设计要点

1. **集成现有配置**: 复用模型配置和提示词管理模块的数据
2. **用户友好**: 简单的输入和配置界面
3. **结果展示**: 清晰的评估结果展示和操作
4. **数据一致性**: 自动填充表单，保持数据同步
5. **错误处理**: 完善的错误处理和重试机制

这个设计是否符合您的需求？请确认后我们继续讨论第二步的功能设计。