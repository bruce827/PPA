import { InfoCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Tree,
  Collapse,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useEffect, useState } from 'react';
import {
  analyzeProjectModules,
  getModuleAnalysisPrompts,
  type AiModuleAnalysisModule,
  type AiModuleAnalysisResult,
  type AiPrompt,
} from '@/services/assessment';
import { getCurrentModel } from '@/services/aiModel';

// 文本域不再使用（改由提示词变量中的 description 提供）
const { Paragraph } = Typography;

type Prompt = AiPrompt;
type AnalysisModule = AiModuleAnalysisModule;
type AnalysisResult = AiModuleAnalysisResult;

interface ProjectModuleAnalyzerProps {
  onModulesGenerated: (
    type: 'dev' | 'integration',
    modules: API.WorkloadRecord[],
  ) => void;
  aiEnabled: boolean;
  roles: API.RoleConfig[];
}

const ProjectModuleAnalyzer: React.FC<ProjectModuleAnalyzerProps> = ({
  onModulesGenerated,
  aiEnabled,
  roles,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  // 当前模型（来自模型应用管理）
  const [currentModelName, setCurrentModelName] = useState<string>('');
  const [currentModelLoading, setCurrentModelLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptVariables, setPromptVariables] = useState<
    Record<string, string>
  >({});
  const [promptsLoading, setPromptsLoading] = useState<boolean>(false);

  // 已移除：项目类型/规模，由提示词变量承载

  useEffect(() => {
    if (aiEnabled) {
      loadAvailablePrompts();
    }
  }, [aiEnabled]);

  // 加载当前模型信息
  useEffect(() => {
    const loadCurrentModel = async () => {
      try {
        setCurrentModelLoading(true);
        const res = await getCurrentModel();
        const model = (res as any)?.data;
        if (model) {
          const label = [model.config_name, model.model_name, model.provider]
            .filter(Boolean)
            .join(' · ');
          setCurrentModelName(label);
        } else {
          setCurrentModelName('未设置当前模型');
        }
      } catch (e) {
        setCurrentModelName('未设置当前模型');
      } finally {
        setCurrentModelLoading(false);
      }
    };
    loadCurrentModel();
  }, []);

  const loadAvailablePrompts = async () => {
    try {
      setPromptsLoading(true);
      const result = await getModuleAnalysisPrompts();
      if (!result?.success) {
        throw new Error(result?.error || '加载提示词失败');
      }

      const prompts = Array.isArray(result.data) ? result.data : [];
      setAvailablePrompts(prompts);
    } catch (error) {
      console.error('加载提示词失败:', error);
      setAvailablePrompts([]);
      setSelectedPrompt(null);
      setPromptVariables({});
      const messageText =
        error instanceof Error
          ? error.message
          : '加载提示词失败，请稍后重试';
      messageApi.error(messageText);
    } finally {
      setPromptsLoading(false);
    }
  };

  const handlePromptChange = (promptId: string) => {
    const prompt = availablePrompts.find((p) => p.id === promptId);
    setSelectedPrompt(prompt || null);

    // 重置变量
    setPromptVariables({});
    if (prompt?.variables) {
      const initialVariables: Record<string, string> = {};
      prompt.variables.forEach((variable) => {
        if (!variable || !variable.name) return;
        const defaultValue =
          variable.default_value !== undefined &&
          variable.default_value !== null
            ? String(variable.default_value)
            : '';
        initialVariables[variable.name] = defaultValue;
      });
      // 前端兜底：最大模块数量默认 20（若模板未给默认值）
      if (
        prompt.variables.some((v) => (v?.name || '').toLowerCase() === 'module_count_max') &&
        (!initialVariables['module_count_max'] || initialVariables['module_count_max'].trim() === '')
      ) {
        initialVariables['module_count_max'] = '20';
      }
      setPromptVariables(initialVariables);
    }
  };

  const handleAnalyze = async () => {
    const sanitizedVariables = Object.entries(promptVariables).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>,
    );
    // 兜底：未填写最大模块数量时默认 20
    if (!sanitizedVariables['module_count_max']) {
      sanitizedVariables['module_count_max'] = '20';
    }

    const variableDescription = (sanitizedVariables['description'] || '').trim();
    if (!variableDescription) {
      messageApi.warning('请填写项目描述');
      return;
    }

    setLoading(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeProjectModules({
        description: variableDescription,
        projectType: sanitizedVariables['project_type'],
        projectScale: sanitizedVariables['project_scale'],
        // 不再传递完整 prompt 对象，避免请求体过大
        promptId: selectedPrompt?.id,
        variables: sanitizedVariables,
        template: 'project_module_analysis',
      });

      if (!result?.success || !result.data) {
        throw new Error(result?.error || '模块梳理失败');
      }

      const analysis = result.data;
      setAnalysisResult(analysis);

      const moduleCount = Array.isArray(analysis.modules)
        ? analysis.modules.length
        : 0;
      if (moduleCount > 0) {
        messageApi.success(`成功梳理出 ${moduleCount} 个功能模块`);
      } else {
        messageApi.warning('AI分析已完成，但未返回模块列表');
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      const messageText =
        error instanceof Error ? error.message : 'AI分析失败，请重试';
      messageApi.error(messageText);
    } finally {
      setLoading(false);
    }
  };

  const getComplexityFactor = (complexity: string): number => {
    switch (complexity) {
      case '简单':
        return 0.6;
      case '中等':
        return 1.0;
      case '复杂':
        return 1.4;
      default:
        return 1.0;
    }
  };

  const createRowId = () =>
    `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  // 清洗模块命名：去掉引号/多余空白/前缀“description:”等
  const sanitizeLabel = (input: unknown): string => {
    let s = String(input ?? '').trim();
    if (!s) return '';
    // 去掉首尾引号与空白
    s = s.replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, '');
    // 移除显式的 description 前缀（大小写不敏感，可带冒号）
    s = s.replace(/\bdescription\b\s*:?\s*/gi, '');
    // 去掉冒号（中英文）
    s = s.replace(/[:：]/g, '');
    // 去除残留的双引号
    s = s.replace(/["“”]+/g, '');
    // 合并多余空格
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  const handleApplyModules = (type: 'dev' | 'integration') => {
    if (analysisResult?.modules) {
      const normalizedModules = analysisResult.modules.map((module) => ({
        id: createRowId(),
        module1: sanitizeLabel(module.module1),
        module2: sanitizeLabel(module.module2),
        module3: sanitizeLabel(module.module3),
        description: module.description,
        delivery_factor: getComplexityFactor(module.complexity),
        workload: 0,
        ...roles.reduce((acc, role) => {
          acc[role.role_name] = 0;
          return acc;
        }, {} as Record<string, number>),
      }));

      onModulesGenerated(type, normalizedModules);
      messageApi.success(
        `已将 ${normalizedModules.length} 个模块导入到${
          type === 'dev' ? '新功能开发' : '系统对接'
        }页面`,
      );
    }
  };

  // 构建Tree数据
  const buildTreeData = (): DataNode[] => {
    if (!analysisResult?.modules) return [];

    const moduleMap = new Map<string, any>();
    analysisResult.modules.forEach((module) => {
      if (!moduleMap.has(module.module1)) {
        moduleMap.set(module.module1, {
          module1: module.module1,
          children: new Map(),
        });
      }
      const level1 = moduleMap.get(module.module1);

      if (!level1.children.has(module.module2)) {
        level1.children.set(module.module2, {
          module2: module.module2,
          children: [],
        });
      }
      const level2 = level1.children.get(module.module2);
      level2.children.push(module);
    });

    return Array.from(moduleMap.values()).map((level1) => ({
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{level1.module1}</span>
        </div>
      ),
      key: level1.module1,
      children: Array.from(level1.children.values()).map((level2) => ({
        title: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{level2.module2}</span>
          </div>
        ),
        key: `${level1.module1}-${level2.module2}`,
        children: level2.children.map((module: AnalysisModule) => ({
          title: (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{module.module3}</span>
              <Space>
                <Tag
                  color={
                    module.complexity === '复杂'
                      ? 'red'
                      : module.complexity === '中等'
                      ? 'orange'
                      : 'green'
                  }
                >
                  {module.complexity}
                </Tag>
              </Space>
            </div>
          ),
          key: `${level1.module1}-${level2.module2}-${module.module3}`,
        })),
      })),
    }));
  };

  // 计算统计信息
  const stats = analysisResult
    ? {
        totalModules: analysisResult.modules.length,
        level1Count: new Set(analysisResult.modules.map((m) => m.module1)).size,
        level2Count: new Set(analysisResult.modules.map((m) => m.module2)).size,
        complexityCount: {
          simple: analysisResult.modules.filter((m) => m.complexity === '简单')
            .length,
          medium: analysisResult.modules.filter((m) => m.complexity === '中等')
            .length,
          complex: analysisResult.modules.filter((m) => m.complexity === '复杂')
            .length,
        },
      }
    : null;

  return (
    <div className="project-module-analyzer">
      {contextHolder}
      {/* 智能输入区域 */}
      <div className="smart-input-section">
        <Card style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SearchOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>AI项目模块智能梳理</span>
              <span style={{ color: '#8c8c8c' }}>
                <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 4 }} />
                选择提示词模板并填写变量，系统将自动生成三级模块结构
              </span>
            </div>
            <div style={{ color: '#595959' }}>
              当前使用模型：<span style={{ fontWeight: 500 }}>{currentModelName}</span>
            </div>
          </div>
        </Card>

        {/* 提示词配置（始终显示） */}
        <Card style={{ marginBottom: 16 }}>
          <h4>🎯 智能配置</h4>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="分析模板">
                <Select
                  value={selectedPrompt?.id}
                  onChange={handlePromptChange}
                  placeholder={promptsLoading ? '加载中...' : '选择AI分析模板'}
                  style={{ width: '100%' }}
                  loading={promptsLoading}
                  allowClear
                >
                  {availablePrompts.map((prompt) => (
                    <Select.Option key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {(!promptsLoading && availablePrompts.length === 0) && (
                <Alert
                  type="info"
                  showIcon
                  message="暂无可用模板"
                  description={
                    <span>
                      请先在“模型配置 → 提示词模板管理”中创建 category=module_analysis 的模板并设为启用。
                    </span>
                  }
                />
              )}
            </Col>
          </Row>

          {/* 提示词预览 */}
          {selectedPrompt?.content && (
            <Collapse
              ghost
              style={{ marginTop: 0, marginBottom: 16 }}
              items={[
                {
                  key: 'content',
                  label: '提示词内容（只读）',
                  children: (
                    <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                      {selectedPrompt.content}
                    </Paragraph>
                  ),
                },
              ]}
            />
          )}

          {selectedPrompt?.variables && selectedPrompt.variables.length > 0 && (
            <>
              {/* 专门渲染 description 变量：多行、独占一行 */}
              {selectedPrompt.variables.some(
                (v) => (v?.name || '').toLowerCase() === 'description',
              ) && (
                <Row gutter={16}>
                  <Col span={24}>
                    {selectedPrompt.variables
                      .filter((v) => (v?.name || '').toLowerCase() === 'description')
                      .map((variable) => (
                        <div key={variable.name} style={{ marginBottom: 16 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              marginBottom: 8,
                              color: '#595959',
                            }}
                          >
                            <span>
                              <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>
                              {`${variable.description}(${variable.display_name || variable.name})`}：
                            </span>
                            <Input.TextArea
                              rows={8}
                              showCount
                              maxLength={3000}
                              style={{ fontFamily: 'monospace' }}
                              value={promptVariables[variable.name] || ''}
                              onChange={(e) =>
                                setPromptVariables((prev) => ({
                                  ...prev,
                                  [variable.name]: e.target.value,
                                }))
                              }
                              placeholder={variable.placeholder || '请输入项目描述（建议≤3000字）'}
                            />
                          </div>
                          {/* {variable.description && (
                            <div style={{ color: '#8c8c8c' }}>{variable.description}</div>
                          )} */}
                        </div>
                      ))}
                  </Col>
                </Row>
              )}

              {/* 其他变量：三列布局 */}
              <Row gutter={16}>
                {selectedPrompt.variables
                  .filter((v) => (v?.name || '').toLowerCase() !== 'description')
                  .map((variable) => {
                    const varName = (variable.name || '').toLowerCase();
                    const isNumber = varName === 'module_count_min' || varName === 'module_count_max';
                    const val = promptVariables[variable.name] || '';
                    return (
                      <Col span={8} key={variable.name}>
                        <div style={{ marginBottom: 16 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 6,
                              color: '#595959',
                              width: '100%',
                            }}
                          >
                            <span>
                              {`${variable.description}(${variable.display_name || variable.name})`}：
                            </span>
                            {isNumber ? (
                              <InputNumber
                                min={1}
                                max={100}
                                precision={0}
                                style={{ width: '100%' }}
                                value={val === '' ? undefined : Number(val)}
                                onChange={(num) =>
                                  setPromptVariables((prev) => ({
                                    ...prev,
                                    [variable.name]: num === null || num === undefined ? '' : String(num),
                                  }))
                                }
                                placeholder={variable.placeholder || '请输入数字'}
                              />
                            ) : (
                              <Input
                                value={val}
                                onChange={(e) =>
                                  setPromptVariables((prev) => ({
                                    ...prev,
                                    [variable.name]: e.target.value,
                                  }))
                                }
                                placeholder={variable.placeholder || ''}
                              />
                            )}
                          </div>
                          {/* {variable.description && (
                            <div style={{ color: '#8c8c8c' }}>{variable.description}</div>
                          )} */}
                        </div>
                      </Col>
                    );
                  })}
              </Row>
            </>
          )}
        </Card>

        <div className="analyze-action">
          <Button
            type="primary"
            onClick={handleAnalyze}
            loading={loading}
            icon={<SearchOutlined />}
            size="large"
            disabled={!selectedPrompt || !(promptVariables['description'] || '').trim()}
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
              <Spin size="large" tip="AI正在分析项目需求，生成模块结构中...">
                <div style={{ minHeight: 24 }} />
              </Spin>
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
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => handleApplyModules('dev')}
                    icon={<PlusOutlined />}
                  >
                    导入到新功能开发
                  </Button>
                  <Button
                    size="large"
                    onClick={() => handleApplyModules('integration')}
                    icon={<PlusOutlined />}
                  >
                    导入到系统对接
                  </Button>
                </Space>
              </div>
            </div>

            {/* 模型信息 */}
            <div style={{ marginTop: 8, marginBottom: 12, color: '#8c8c8c' }}>
              模型：
              {((analysisResult as any)?.model_used as string) || currentModelName || '—'}
            </div>

            {/* 项目分析总结 */}
            <div className="project-summary" style={{ marginBottom: 24 }}>
              <h4>📋 项目分析总结</h4>
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                {analysisResult.project_analysis || '—'}
              </Paragraph>
            </div>

            {/* 统计信息 */}
            {stats && (
              <div className="stats-section" style={{ marginBottom: 24 }}>
                <h4>📊 模块统计</h4>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="总模块数"
                      value={stats.totalModules}
                      suffix="个"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="一级模块"
                      value={stats.level1Count}
                      suffix="个"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="二级模块"
                      value={stats.level2Count}
                      suffix="个"
                    />
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{ fontSize: 14, color: '#666', marginBottom: 4 }}
                      >
                        复杂度分布
                      </div>
                      <Space>
                        <Tag color="green">
                          简单 {stats.complexityCount.simple}
                        </Tag>
                        <Tag color="orange">
                          中等 {stats.complexityCount.medium}
                        </Tag>
                        <Tag color="red">
                          复杂 {stats.complexityCount.complex}
                        </Tag>
                      </Space>
                    </div>
                  </Col>
                </Row>
              </div>
            )}

            {/* 模块结构预览 */}
            <div className="modules-preview">
              <h4>🏗️ 生成的功能模块结构</h4>
              <Tree
                treeData={buildTreeData()}
                defaultExpandAll
                showLine={{ showLeafIcon: false }}
                style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProjectModuleAnalyzer;
