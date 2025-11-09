# 新建评估页面 - AI智能工作量估算功能设计

## 功能概述

在新建评估页面的第二步（工作量估算步骤）中集成AI智能功能，通过项目描述自动梳理模块结构，并为任意模块提供一键智能工作量评估。

## 核心功能

### 第二步：AI智能工作量估算

## 详细设计

### 1. 整体界面布局设计

#### 在WorkloadEstimation组件中添加AI功能
```jsx
// pages/Assessment/components/WorkloadEstimation.tsx 增强
const WorkloadEstimation = ({ configData, initialValues, onWorkloadChange, onPrev, onNext }) => {
  const roles = configData.roles ?? [];
  
  // AI相关状态
  const [activeTab, setActiveTab] = useState('module-analyzer');
  const [aiLoading, setAiLoading] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [currentEvaluatedRecord, setCurrentEvaluatedRecord] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluationModalVisible, setEvaluationModalVisible] = useState(false);
  
  const handleAIGeneration = async (type, modules) => {
    setAiLoading(true);
    try {
      if (type === 'dev') {
        handleDevChange([...devWorkload, ...modules]);
        message.success(`成功生成 ${modules.length} 个新功能开发模块`);
      } else {
        handleIntegrationChange([...integrationWorkload, ...modules]);
        message.success(`成功生成 ${modules.length} 个系统对接模块`);
      }
    } catch (error) {
      message.error('AI生成失败，请重试');
    } finally {
      setAiLoading(false);
    }
  };
  
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
      }
    } catch (error) {
      message.error('工作量评估失败，请重试');
    } finally {
      setEvaluationLoading(false);
    }
  };
  
  const handleApplyEvaluation = (updatedRecord) => {
    if (currentEvaluatedRecord) {
      const updatedList = devWorkload.map(item => 
        item.id === currentEvaluatedRecord.id ? updatedRecord : item
      );
      handleDevChange(updatedList);
    }
    
    setEvaluationModalVisible(false);
    setCurrentEvaluatedRecord(null);
    setEvaluationResult(null);
    message.success('工作量评估结果已应用');
  };
  
  return (
    <div className="workload-estimation">
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="large"
      >
        <TabPane 
          tab={
            <span>
              <SearchOutlined />
              AI模块梳理
            </span>
          } 
          key="module-analyzer"
        >
          <ProjectModuleAnalyzer 
            onModulesGenerated={(modules) => handleAIGeneration('dev', modules)}
            aiEnabled={true}
            roles={roles}
          />
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <CodeOutlined />
              新功能开发
            </span>
          } 
          key="development"
        >
          <EditableProTable
            // ... 现有props
            columns={[
              ...displayColumns,
              {
                title: '操作',
                valueType: 'option',
                width: 280,
                align: 'center',
                render: (_, record, __, action) => {
                  const isEditing = devEditableKeys.includes(record.id);
                  const isEvaluating = evaluationLoading && currentEvaluatedRecord?.id === record.id;
                  
                  return isEditing ? [
                    <a key="detail" onClick={() => handleShowDetail(record)}>详情</a>,
                    <a 
                      key="evaluate" 
                      onClick={() => handleSingleEvaluation(record)}
                      disabled={evaluationLoading}
                    >
                      {isEvaluating ? '评估中...' : '一键评估'}
                    </a>,
                    <a key="save" onClick={() => action?.save?.(record.id)}>保存</a>,
                    <a key="cancel" onClick={() => action?.cancelEditable?.(record.id)}>取消</a>,
                    <a key="delete" onClick={() => removeRow('dev', record.id)}>删除</a>
                  ] : [
                    <a key="detail" onClick={() => handleShowDetail(record)}>详情</a>,
                    <a 
                      key="evaluate" 
                      onClick={() => handleSingleEvaluation(record)}
                      disabled={evaluationLoading}
                    >
                      一键评估
                    </a>,
                    <a key="edit" onClick={() => action?.startEditable?.(record.id)}>编辑</a>,
                    <a key="delete" onClick={() => removeRow('dev', record.id)}>删除</a>
                  ];
                }
              }
            ]}
            toolBarRender={() => [
              <Button 
                key="ai-eval" 
                icon={<ThunderboltOutlined />}
                onClick={handleBatchEvaluation}
                disabled={selectedRowKeys.length === 0}
              >
                批量AI评估 ({selectedRowKeys.length})
              </Button>
            ]}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys
            }}
          />
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <ApiOutlined />
              系统对接工作量
            </span>
          } 
          key="integration"
        >
          <EditableProTable
            // ... 类似的结构和评估功能
            columns={[
              ...displayColumns,
              {
                title: '操作',
                valueType: 'option',
                width: 280,
                align: 'center',
                render: (_, record, __, action) => {
                  const isEditing = integrationEditableKeys.includes(record.id);
                  
                  return isEditing ? [
                    <a key="detail" onClick={() => handleShowDetail(record)}>详情</a>,
                    <a 
                      key="evaluate" 
                      onClick={() => handleSingleEvaluation(record)}
                      disabled={evaluationLoading}
                    >
                      一键评估
                    </a>,
                    <a key="save" onClick={() => action?.save?.(record.id)}>保存</a>,
                    <a key="cancel" onClick={() => action?.cancelEditable?.(record.id)}>取消</a>,
                    <a key="delete" onClick={() => removeRow('integration', record.id)}>删除</a>
                  ] : [
                    <a key="detail" onClick={() => handleShowDetail(record)}>详情</a>,
                    <a 
                      key="evaluate" 
                      onClick={() => handleSingleEvaluation(record)}
                      disabled={evaluationLoading}
                    >
                      一键评估
                    </a>,
                    <a key="edit" onClick={() => action?.startEditable?.(record.id)}>编辑</a>,
                    <a key="delete" onClick={() => removeRow('integration', record.id)}>删除</a>
                  ];
                }
              }
            ]}
          />
        </TabPane>
      </Tabs>
      
      {/* 评估结果确认弹窗 */}
      <WorkloadEvaluationModal
        visible={evaluationModalVisible}
        record={currentEvaluatedRecord}
        evaluationResult={evaluationResult}
        roles={roles}
        onClose={() => setEvaluationModalVisible(false)}
        onApply={handleApplyEvaluation}
      />
    </div>
  );
};
```

### 2. 项目描述到模块梳理功能

#### 独立AI模块梳理器组件
```jsx
// ProjectModuleAnalyzer.jsx
const ProjectModuleAnalyzer = ({ onModulesGenerated, aiEnabled, roles }) => {
  const [projectDescription, setProjectDescription] = useState('');
  const [projectType, setProjectType] = useState('custom');
  const [projectScale, setProjectScale] = useState('medium');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptVariables, setPromptVariables] = useState({});
  
  // 项目类型选项
  const projectTypes = [
    { value: 'web', label: 'Web应用', icon: <GlobalOutlined /> },
    { value: 'mobile', label: '移动应用', icon: <MobileOutlined /> },
    { value: 'desktop', label: '桌面应用', icon: <DesktopOutlined /> },
    { value: 'enterprise', label: '企业级系统', icon: <ClusterOutlined /> },
    { value: 'iot', label: '物联网系统', icon: <ApiOutlined /> },
    { value: 'ai', label: 'AI/ML系统', icon: <BrainCircuitOutlined /> },
    { value: 'blockchain', label: '区块链', icon: <CoinsOutlined /> },
    { value: 'custom', label: '自定义', icon: <SettingOutlined /> }
  ];
  
  const projectScales = [
    { value: 'small', label: '小型项目 (< 3个月)' },
    { value: 'medium', label: '中型项目 (3-12个月)' },
    { value: 'large', label: '大型项目 (1-2年)' },
    { value: 'enterprise', label: '企业级项目 (> 2年)' }
  ];
  
  useEffect(() => {
    if (aiEnabled) {
      loadAvailablePrompts();
    }
  }, [aiEnabled]);
  
  const loadAvailablePrompts = async () => {
    try {
      const result = await fetch('/api/ai/module-prompts');
      const prompts = await result.json();
      setAvailablePrompts(prompts.data || []);
    } catch (error) {
      console.error('加载提示词失败:', error);
    }
  };
  
  const handleAnalyze = async () => {
    if (!projectDescription.trim()) {
      message.warning('请输入项目描述');
      return;
    }
    
    setLoading(true);
    try {
      const result = await aiService.analyzeProjectModules({
        description: projectDescription,
        projectType,
        projectScale,
        prompt: selectedPrompt,
        variables: promptVariables,
        template: 'project_module_analysis'
      });
      
      if (result.success) {
        setAnalysisResult(result.data);
        message.success(`成功梳理出 ${result.data.modules.length} 个功能模块`);
      } else {
        message.error(result.error || '模块梳理失败');
      }
    } catch (error) {
      message.error('AI分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApplyModules = () => {
    if (analysisResult?.modules) {
      const normalizedModules = analysisResult.modules.map(module => ({
        id: createRowId(),
        module1: module.module1,
        module2: module.module2,
        module3: module.module3,
        description: module.description,
        delivery_factor: getComplexityFactor(module.complexity),
        workload: 0,
        ...(roles.reduce((acc, role) => {
          acc[role.role_name] = 0;
          return acc;
        }, {} as Record<string, number>))
      }));
      
      onModulesGenerated(normalizedModules);
      message.success(`已将 ${normalizedModules.length} 个模块导入到新功能开发页面`);
    }
  };
  
  return (
    <div className="project-module-analyzer">
      {/* 智能输入区域 */}
      <div className="smart-input-section">
        <div className="input-header">
          <h3>
            <SearchOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            AI项目模块智能梳理
          </h3>
          <div className="input-tips">
            <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 4 }} />
            详细描述您的项目需求，AI将自动分析并生成完整的功能模块结构
          </div>
        </div>
        
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="项目类型" required>
                <Select
                  value={projectType}
                  onChange={setProjectType}
                  style={{ width: '100%' }}
                >
                  {projectTypes.map(type => (
                    <Select.Option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="项目规模" required>
                <Select
                  value={projectScale}
                  onChange={setProjectScale}
                  style={{ width: '100%' }}
                >
                  {projectScales.map(scale => (
                    <Select.Option key={scale.value} value={scale.value}>
                      {scale.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="当前使用模型">
                <Input
                  value="GPT-4 (来自模型配置)"
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <TextArea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="请详细描述您的项目需求...

例如：
- 项目目标和主要功能
- 技术要求和技术栈
- 目标用户和业务场景
- 数据处理和集成需求
- 特殊功能或约束条件

AI将基于这些信息生成完整的三级模块结构："
            rows={10}
            showCount
            maxLength={2000}
            style={{ fontFamily: 'monospace' }}
          />
        </Card>
        
        {/* 提示词配置 */}
        {availablePrompts.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <h4>🎯 智能配置</h4>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="分析模板">
                  <Select
                    value={selectedPrompt?.id}
                    onChange={handlePromptChange}
                    placeholder="选择AI分析模板"
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
            </Row>
            
            {selectedPrompt?.variables && selectedPrompt.variables.length > 0 && (
              <Row gutter={16}>
                {selectedPrompt.variables.map(variable => (
                  <Col span={8} key={variable.name}>
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
            )}
          </Card>
        )}
        
        <div className="analyze-action">
          <Button 
            type="primary" 
            onClick={handleAnalyze}
            loading={loading}
            icon={<SearchOutlined />}
            size="large"
            disabled={!projectDescription.trim()}
          >
            {loading ? 'AI正在分析中...' : '开始AI模块分析'}
          </Button>
        </div>
      </div>
      
      {/* 分析结果展示 */}
      {loading && (
        <div className="analysis-loading">
          <Card>
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" tip="AI正在分析项目需求，生成模块结构中..." />
              <div style={{ marginTop: 16, color: '#666' }}>
                这通常需要几分钟时间，请稍等...
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {analysisResult && (
        <div className="analysis-result">
          <Card>
            <div className="result-header">
              <h3>🎯 分析结果</h3>
              <div className="result-actions">
                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleApplyModules}
                  icon={<PlusOutlined />}
                >
                  导入到新功能开发
                </Button>
              </div>
            </div>
            
            {/* 项目分析总结 */}
            <div className="project-summary" style={{ marginBottom: 24 }}>
              <h4>📋 项目分析总结</h4>
              <Alert
                message="基于AI分析的项目概况"
                description={analysisResult.project_analysis}
                type="info"
                showIcon
              />
            </div>
            
            {/* 模块结构预览 */}
            <div className="modules-preview">
              <h4>🏗️ 生成的功能模块结构</h4>
              <Table
                dataSource={analysisResult.modules}
                columns={[
                  { 
                    title: '一级模块', 
                    dataIndex: 'module1', 
                    width: 150,
                    render: (text) => <Tag color="blue">{text}</Tag>
                  },
                  { 
                    title: '二级模块', 
                    dataIndex: 'module2', 
                    width: 150,
                    render: (text) => <Tag color="green">{text}</Tag>
                  },
                  { 
                    title: '三级模块', 
                    dataIndex: 'module3', 
                    width: 150,
                    render: (text) => <Tag color="orange">{text}</Tag>
                  },
                  { 
                    title: '模块描述', 
                    dataIndex: 'description',
                    ellipsis: true
                  },
                  { 
                    title: '复杂度', 
                    dataIndex: 'complexity', 
                    width: 100,
                    render: (text) => {
                      const color = text === '复杂' ? 'red' : text === '中等' ? 'orange' : 'green';
                      return <Tag color={color}>{text}</Tag>;
                    }
                  }
                ]}
                pagination={{ pageSize: 10 }}
                size="small"
                rowKey={(record, index) => `module-${index}`}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <div style={{ textAlign: 'center', fontWeight: 500 }}>
                        共生成 {analysisResult.modules.length} 个功能模块
                      </div>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
```

### 3. 单模块一键工作量评估功能

#### 评估结果确认弹窗
```jsx
// WorkloadEvaluationModal.jsx
const WorkloadEvaluationModal = ({ 
  visible, 
  onClose, 
  onApply, 
  record, 
  evaluationResult, 
  roles 
}) => {
  const handleApplyResult = () => {
    if (evaluationResult) {
      // 计算总工时
      const totalWorkload = Object.values(evaluationResult).reduce((sum, days) => sum + days, 0);
      
      // 应用评估结果
      const updatedRecord = {
        ...record,
        ...evaluationResult,
        workload: Number(totalWorkload.toFixed(1)),
        delivery_factor: record.delivery_factor || 1.0
      };
      
      onApply(updatedRecord);
    }
  };
  
  return (
    <Modal
      title="🤖 AI工作量评估结果"
      visible={visible}
      onOk={handleApplyResult}
      onCancel={onClose}
      width={1000}
      okText="应用评估结果"
      cancelText="取消"
    >
      <div className="evaluation-result-content">
        {/* 模块信息 */}
        <div className="module-info">
          <h4>📋 评估模块信息</h4>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="一级模块">{record?.module1}</Descriptions.Item>
            <Descriptions.Item label="二级模块">{record?.module2}</Descriptions.Item>
            <Descriptions.Item label="三级模块">{record?.module3}</Descriptions.Item>
            <Descriptions.Item label="交付系数">{record?.delivery_factor || 1.0}</Descriptions.Item>
            <Descriptions.Item label="模块描述" span={2}>{record?.description}</Descriptions.Item>
          </Descriptions>
        </div>
        
        {/* 角色工作量评估 */}
        <div className="workload-result" style={{ marginTop: 16 }}>
          <h4>👥 角色工作量评估结果</h4>
          <Table
            dataSource={Object.entries(evaluationResult || {}).map(([role, days]) => {
              const roleConfig = roles.find(r => r.role_name === role);
              return {
                role,
                days,
                unitPrice: roleConfig?.unit_price || 0,
                cost: (days * (roleConfig?.unit_price || 0)) / 10000
              };
            })}
            columns={[
              { 
                title: '角色', 
                dataIndex: 'role', 
                width: 120,
                render: (text) => <Tag color="blue">{text}</Tag>
              },
              { 
                title: '工作量(天)', 
                dataIndex: 'days', 
                width: 120, 
                align: 'center',
                render: (val) => <span style={{ color: '#1890ff', fontWeight: 500 }}>{val}</span>
              },
              { 
                title: '单价(元/天)', 
                dataIndex: 'unitPrice', 
                width: 120, 
                align: 'right', 
                render: (val) => val ? val.toLocaleString() : '—' 
              },
              { 
                title: '成本(万元)', 
                dataIndex: 'cost', 
                width: 120, 
                align: 'right', 
                render: (val) => val ? <span style={{ color: '#52c41a', fontWeight: 500 }}>{val.toFixed(2)}</span> : '—' 
              }
            ]}
            pagination={false}
            size="small"
            footer={() => {
              const totalDays = Object.values(evaluationResult || {}).reduce((sum, days) => sum + days, 0);
              const totalCost = Object.entries(evaluationResult || {}).reduce((sum, [role, days]) => {
                const roleConfig = roles.find(r => r.role_name === role);
                return sum + (days * (roleConfig?.unit_price || 0)) / 10000;
              }, 0);
              
              return (
                <div style={{ 
                  textAlign: 'right', 
                  fontWeight: 600,
                  color: '#1890ff',
                  fontSize: '16px'
                }}>
                  总计：{totalDays} 人天，{totalCost.toFixed(2)} 万元
                </div>
              );
            }}
          />
        </div>
        
        {/* 评估说明 */}
        <div className="evaluation-notes" style={{ marginTop: 16 }}>
          <Alert
            message="评估说明"
            description="以上评估基于AI对模块复杂度的分析，实际开发中可能因具体实现方案、团队经验等因素有所调整。建议在制定详细计划时结合团队实际情况进行适当修正。"
            type="info"
            showIcon
          />
        </div>
      </div>
    </Modal>
  );
};
```

### 4. 批量评估功能

```jsx
// 批量评估面板
const BatchEvaluationPanel = ({ selectedRecords, onBatchEvaluation, roles }) => {
  const [batchLoading, setBatchLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  
  const handleBatchEvaluation = async () => {
    setBatchLoading(true);
    setProgress(0);
    
    const results = [];
    
    for (let i = 0; i < selectedRecords.length; i++) {
      const record = selectedRecords[i];
      setCurrentTask(`正在评估: ${record.module1} - ${record.module2} - ${record.module3}`);
      
      try {
        const result = await aiService.evaluateWorkload({
          module1: record.module1,
          module2: record.module2,
          module3: record.module3,
          description: record.description,
          template: 'workload_evaluation'
        });
        
        if (result.success) {
          results.push({ 
            id: record.id, 
            ...result.data,
            totalWorkload: Object.values(result.data).reduce((sum, days) => sum + days, 0)
          });
        }
      } catch (error) {
        console.error(`评估失败: ${record.id}`, error);
      }
      
      setProgress(((i + 1) / selectedRecords.length) * 100);
    }
    
    onBatchEvaluation(results);
    setBatchLoading(false);
    setCurrentTask('');
  };
  
  return (
    <Card size="small" style={{ marginTop: 16 }}>
      <div className="batch-evaluation-header">
        <h5>📊 批量AI评估</h5>
        <div className="batch-info">
          已选择 {selectedRecords.length} 个模块待评估
        </div>
      </div>
      
      {batchLoading ? (
        <div className="batch-progress">
          <Progress percent={progress} status="active" />
          <div className="current-task">
            <LoadingOutlined /> {currentTask}
          </div>
        </div>
      ) : (
        <Button 
          type="primary" 
          onClick={handleBatchEvaluation}
          disabled={selectedRecords.length === 0}
          icon={<ThunderboltOutlined />}
          size="large"
        >
          开始批量AI评估
        </Button>
      )}
    </Card>
  );
};
```

### 5. 后端API设计

```javascript
// routes/ai.js
// 模块分析API
router.post('/analyze-project-modules', async (req, res) => {
  const { description, projectType, projectScale, prompt, variables } = req.body;
  
  try {
    const result = await aiService.analyzeProjectModules({
      description,
      projectType,
      projectScale,
      prompt,
      variables,
      modelConfig: await getCurrentModelConfig()
    });
    
    res.json(result);
  } catch (error) {
    console.error('AI模块分析错误:', error);
    res.status(500).json({ success: false, error: '模块分析失败' });
  }
});

router.get('/module-prompts', async (req, res) => {
  try {
    // 从模型配置/提示词管理模块获取模块分析相关的提示词
    const prompts = await getPromptsFromModelConfig('module_analysis');
    res.json({ success: true, data: prompts });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取提示词失败' });
  }
});

// 工作量评估API
router.post('/evaluate-workload', async (req, res) => {
  const { module1, module2, module3, description } = req.body;
  
  try {
    const result = await aiService.evaluateWorkload({
      module1, module2, module3, description,
      modelConfig: await getCurrentModelConfig()
    });
    
    res.json(result);
  } catch (error) {
    console.error('AI工作量评估错误:', error);
    res.status(500).json({ success: false, error: '工作量评估失败' });
  }
});
```

### 6. AI服务实现

```javascript
// services/aiService.js
class AIService {
  async analyzeProjectModules(params) {
    const { description, projectType, projectScale, prompt, variables } = params;
    
    try {
      // 构建模块分析提示词
      const fullPrompt = this.buildModuleAnalysisPrompt({
        template: prompt?.content || this.getDefaultModulePrompt(),
        variables,
        description,
        projectType,
        projectScale
      });
      
      // 调用AI模型
      const aiResponse = await this.callConfiguredModel(
        params.modelConfig, 
        fullPrompt
      );
      
      // 解析AI响应
      const analysisResult = this.parseModuleAnalysisResponse(aiResponse);
      
      return {
        success: true,
        data: analysisResult
      };
    } catch (error) {
      console.error('AI模块分析失败:', error);
      return {
        success: false,
        error: 'AI模块分析失败，请检查模型配置'
      };
    }
  }
  
  async evaluateWorkload(params) {
    const { module1, module2, module3, description } = params;
    
    try {
      const prompt = this.buildWorkloadEvaluationPrompt({
        module1, module2, module3, description
      });
      
      const aiResponse = await this.callConfiguredModel(
        params.modelConfig,
        prompt
      );
      
      const evaluationResult = this.parseWorkloadResponse(aiResponse);
      
      return {
        success: true,
        data: evaluationResult
      };
    } catch (error) {
      console.error('AI工作量评估失败:', error);
      return {
        success: false,
        error: 'AI工作量评估失败，请检查模型配置'
      };
    }
  }
  
  buildModuleAnalysisPrompt({ template, variables, description, projectType, projectScale }) {
    let prompt = template;
    
    // 替换变量
    Object.keys(variables).forEach(key => {
      prompt = prompt.replace(new RegExp(`{{\\\\s*${key}\\\\s*}}`, 'g'), variables[key]);
    });
    
    // 添加项目信息
    const enhancedPrompt = `
${prompt}

=== 项目基本信息 ===
项目类型：${projectType}
项目规模：${projectScale}

=== 详细需求描述 ===
${description}

=== 任务要求 ===
请基于以上信息，分析项目需求并生成5-8个主要功能模块，每个模块包含：
- 一级模块：主要功能领域
- 二级模块：具体功能模块
- 三级模块：详细功能点
- 模块描述：功能详细说明
- 复杂度：简单/中等/复杂

请以以下JSON格式返回：
{
  "project_analysis": "项目分析总结（100-200字）",
  "modules": [
    {
      "module1": "一级模块名称",
      "module2": "二级模块名称",
      "module3": "三级模块名称",
      "description": "模块详细描述（50-100字）",
      "complexity": "简单/中等/复杂"
    }
  ]
}

请确保模块结构合理，描述准确，复杂度评估客观。
`;
    
    return enhancedPrompt;
  }
  
  buildWorkloadEvaluationPrompt({ module1, module2, module3, description }) {
    return `
根据以下模块信息评估软件开发工作量：

=== 模块信息 ===
一级模块：${module1}
二级模块：${module2}
三级模块：${module3}
功能描述：${description}

=== 评估要求 ===
请为每个角色评估工作量（人/天），考虑模块复杂度和功能需求：

- 项目经理：X天（协调管理）
- 技术经理：X天（技术指导）
- UI设计：X天（界面设计）
- 后端开发：X天（后端实现）
- 前端开发：X天（前端实现）
- 数据库：X天（数据库设计）
- 测试：X天（测试验证）
- 实施：X天（部署实施）
- 产品经理：X天（产品规划）

评估原则：
- 简单功能：3-8人/天
- 中等功能：8-20人/天
- 复杂功能：20-40人/天

请以JSON格式返回各角色工作天数：
{
  "项目经理": X,
  "技术经理": X,
  "UI设计": X,
  "后端开发": X,
  "前端开发": X,
  "数据库": X,
  "测试": X,
  "实施": X,
  "产品经理": X
}

请确保评估合理，分配符合实际开发流程。
`;
  }
  
  parseModuleAnalysisResponse(response) {
    try {
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          project_analysis: parsed.project_analysis || '基于项目描述分析生成的功能模块结构',
          modules: parsed.modules || [],
          confidence: 0.8
        };
      } else {
        return this.extractModulesFromText(response);
      }
    } catch (error) {
      console.error('解析模块分析响应失败:', error);
      return this.extractModulesFromText(response);
    }
  }
  
  parseWorkloadResponse(response) {
    try {
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateWorkloadResult(parsed);
      } else {
        return this.extractWorkloadFromText(response);
      }
    } catch (error) {
      console.error('解析工作量评估响应失败:', error);
      return this.extractWorkloadFromText(response);
    }
  }
  
  validateWorkloadResult(workload) {
    // 验证和标准化工作量结果
    const validated = {};
    const defaultRoles = ['项目经理', '技术经理', 'UI设计', '后端开发', '前端开发', '数据库', '测试', '实施', '产品经理'];
    
    defaultRoles.forEach(role => {
      const days = Number(workload[role] || 0);
      validated[role] = Math.max(0, days); // 确保非负数
    });
    
    return validated;
  }
  
  getDefaultModulePrompt() {
    return `
请分析项目需求并生成功能模块结构。
`;
  }
}
```

### 7. 工具函数

```javascript
// utils/workloadUtils.js
// 根据复杂度计算交付系数
export const getComplexityFactor = (complexity) => {
  switch (complexity) {
    case '简单': return 0.6;
    case '中等': return 1.0;
    case '复杂': return 1.4;
    default: return 1.0;
  }
};

// 生成记录ID
export const createRowId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
};

// 标准化WorkloadRecord
export const normalizeWorkloadRecord = (record, roles) => {
  const normalized = { ...record };
  
  // 确保所有角色字段存在
  roles.forEach(role => {
    const value = Number(normalized[role.role_name] ?? 0);
    normalized[role.role_name] = Number.isFinite(value) ? value : 0;
  });
  
  // 计算工时
  let totalRoleDays = 0;
  roles.forEach(role => {
    totalRoleDays += Number(normalized[role.role_name] ?? 0);
  });
  
  const factor = Number(normalized.delivery_factor ?? 1);
  normalized.delivery_factor = Number.isFinite(factor) ? Number(factor.toFixed(2)) : 1;
  
  const workloadInput = Number(normalized.workload ?? totalRoleDays * factor);
  normalized.workload = Number.isFinite(workloadInput) ? workloadInput : totalRoleDays * factor;
  
  return normalized;
};
```

### 8. 界面样式设计

```css
.project-module-analyzer {
  padding: 24px;
}

.smart-input-section {
  background: #f8f9ff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.input-header h3 {
  color: #1890ff;
  margin-bottom: 8px;
}

.input-tips {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.analyze-action {
  text-align: center;
  margin-top: 16px;
}

.analysis-loading {
  margin-bottom: 24px;
}

.analysis-result .result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.evaluation-result-content .module-info {
  margin-bottom: 24px;
}

.evaluation-result-content .workload-result {
  margin-bottom: 16px;
}

.batch-evaluation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.batch-progress {
  margin: 16px 0;
}

.current-task {
  color: #1890ff;
  font-size: 14px;
  margin-top: 8px;
}
```

## 功能流程图

### 场景1: 项目描述到模块梳理
```
1. 用户切换到"AI模块梳理"标签
2. 选择项目类型和规模
3. 详细输入项目描述
4. 选择分析模板和配置变量
5. 点击"开始AI模块分析"
6. AI分析项目需求并生成模块结构
7. 展示分析结果和模块预览
8. 点击"导入到新功能开发"
9. 模块自动填充到工作量估算页面
```

### 场景2: 单模块工作量评估
```
1. 在新功能开发或系统对接列表中
2. 找到需要评估的模块
3. 点击"一键评估"操作
4. AI分析模块信息并评估工作量
5. 显示评估结果确认弹窗
6. 用户查看各角色工作量和成本
7. 点击"应用评估结果"
8. 自动填充到模块中，计算总工时
```

## 数据集成说明

### 复用的现有配置
- **模型配置/模型管理**: 获取用户当前配置的AI模型
- **模型配置/提示词管理**: 获取模块分析和工作量评估的提示词模板
- **参数配置/角色配置**: 获取系统中的角色列表和单价
- **当前表单数据**: 保持与现有工作量数据的一致性

### 数据流向
```
项目描述 → AI分析 → 模块结构 → 标准化 → 导入表单
模块信息 → AI评估 → 角色工作量 → 计算总工时 → 填充表单
```

## 关键设计原则

1. **流程清晰**: 从描述到模块到评估的完整流程
2. **操作简单**: 一键操作，减少用户输入
3. **结果可靠**: 基于AI分析的专业评估
4. **数据一致**: 与现有系统数据保持同步
5. **可扩展性**: 支持批量操作和进一步优化
6. **用户体验**: 清晰的界面和反馈机制

这个设计方案实现了您要求的两个核心AI功能，确保从项目描述到模块梳理和单模块工作量评估的完整流程。请确认这个设计是否符合您的需求。