import {
  BarChartOutlined,
  FileTextOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  Collapse,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { MAX_DOCUMENT_LENGTH, RISK_LEVEL_COLORS } from '@/constants';
import {
  assessRiskWithAI,
  getAiPrompts,
  normalizeRiskNames,
  type AiAssessmentResult,
  type AiPrompt,
  type AiRiskScoreSuggestion,
} from '@/services/assessment';
import './AIAssessmentModal.less';

// 类型定义
type Prompt = AiPrompt;
type RiskScoreSuggestion = AiRiskScoreSuggestion;
type AssessmentResult = AiAssessmentResult;

interface AIAssessmentModalProps {
  visible: boolean;
  onClose: () => void;
  onAssessmentComplete: (result: AssessmentResult) => void;
  currentRiskItems: Record<string, number | string | undefined>;
  riskItemConfigs?: API.RiskItemConfig[];
}

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const AIAssessmentModal: React.FC<AIAssessmentModalProps> = ({
  visible,
  onClose,
  onAssessmentComplete,
  currentRiskItems,
  riskItemConfigs = [],
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  // 状态管理
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [assessmentResult, setAssessmentResult] =
    useState<AssessmentResult | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [latestModel, setLatestModel] = useState<string | null>(null);
  

  // 加载可用提示词
  const loadAvailablePrompts = async () => {
    setPromptsLoading(true);
    try {
      const result = await getAiPrompts();
      if (!result?.success) {
        throw new Error(result?.error || '加载提示词失败');
      }

      const prompts: Prompt[] = Array.isArray(result.data)
        ? result.data
        : [];
      setAvailablePrompts(prompts);
    } catch (error) {
      console.error('加载提示词失败:', error);
      setAvailablePrompts([]);
      const messageText =
        error instanceof Error
          ? error.message
          : '加载提示词失败，请稍后重试';
      messageApi.error(messageText);
      form.setFieldsValue({ promptId: undefined, variables: {} });
      setSelectedPrompt(null);
    } finally {
      setPromptsLoading(false);
    }
  };

  // 处理提示词选择变化
  const handlePromptChange = (promptId?: string) => {
    setLatestModel(null);
    setAssessmentResult(null);

    if (!promptId) {
      setSelectedPrompt(null);
      form.setFieldsValue({ promptId: undefined, variables: {} });
      return;
    }

    const prompt = availablePrompts.find((p) => p.id === promptId) || null;
    setSelectedPrompt(prompt);

    if (prompt && prompt.variables && prompt.variables.length > 0) {
      const defaultVariables = prompt.variables.reduce(
        (acc, variable) => {
          acc[variable.name] = variable.default_value || '';
          return acc;
        },
        {} as Record<string, string>,
      );
      form.setFieldsValue({ promptId, variables: defaultVariables });
    } else {
      form.setFieldsValue({ promptId, variables: {} });
    }
  };

  // 处理AI评估
  const handleAssessment = async () => {
    try {
      await form.validateFields();

      const trimmedDocument = documentText.trim();
      if (!trimmedDocument) {
        messageApi.warning('请输入项目文档内容');
        return;
      }

      if (trimmedDocument.length > MAX_DOCUMENT_LENGTH) {
        messageApi.warning(
          `项目文档内容最多${MAX_DOCUMENT_LENGTH}字，请精简后再试`,
        );
        return;
      }

      const promptId =
        form.getFieldValue('promptId') || selectedPrompt?.id || '';
      if (!promptId) {
        messageApi.warning('请选择提示词模板');
        return;
      }

      setLoading(true);
      setAssessmentResult(null);

      const rawVariables = form.getFieldValue('variables') || {};
      const sanitizedVariables = Object.entries(rawVariables).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      const currentScoresSource = currentRiskItems || {};
      const normalizedScores = Object.entries(currentScoresSource).reduce(
        (acc, [key, value]) => {
          const numericValue = Number(value);
          if (Number.isFinite(numericValue)) {
            acc[key] = numericValue;
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      const mappedRiskItems =
        riskItemConfigs.length > 0
          ? riskItemConfigs.map((item) => {
              const rawScore = currentScoresSource[item.item_name];
              const numericScore = Number(rawScore);
              return {
                item_name: item.item_name,
                description: item.category,
                current_score: Number.isFinite(numericScore)
                  ? numericScore
                  : undefined,
              };
            })
          : Object.entries(currentScoresSource).map(([itemName, value]) => {
              const numericScore = Number(value);
              return {
                item_name: itemName,
                current_score: Number.isFinite(numericScore)
                  ? numericScore
                  : undefined,
              };
            });

      const requestData = {
        document: trimmedDocument,
        promptId,
        variables: sanitizedVariables,
        currentRiskItems: mappedRiskItems,
        currentScores: normalizedScores,
      };
      const result = await assessRiskWithAI(requestData);
      if (!result?.success) {
        throw new Error(result?.error || 'AI评估失败');
      }

      const serviceData = result.data || {};
      const parsedResult: AssessmentResult | undefined = serviceData.parsed;

      let effectiveResult: AssessmentResult | null = null;
      if (parsedResult?.risk_scores?.length) {
        effectiveResult = parsedResult;
      } else if (serviceData.raw_response) {
        effectiveResult = parseAIResponse(serviceData.raw_response);
      } else if (parsedResult && Array.isArray(parsedResult.risk_scores) && parsedResult.risk_scores.length === 0) {
        effectiveResult = parsedResult;
      }

      if (!effectiveResult?.risk_scores || effectiveResult.risk_scores.length === 0) {
        setAssessmentResult({
          risk_scores: [],
          missing_risks: effectiveResult?.missing_risks,
          overall_suggestion:
            effectiveResult?.overall_suggestion ||
            '模型未返回任何风险评分，请检查文档内容或提示词配置。',
          confidence: effectiveResult?.confidence,
        });
        setLatestModel(serviceData.model_used || selectedPrompt?.model_hint || null);
        messageApi.warning('AI评估完成，但未返回任何风险评分。');
        return;
      }

      setAssessmentResult(effectiveResult);
      setLatestModel(serviceData.model_used || selectedPrompt?.model_hint || null);
      messageApi.success('AI评估完成');
    } catch (error) {
      console.error('AI评估失败:', error);
      const messageText =
        error instanceof Error ? error.message : 'AI评估失败，请重试';
      messageApi.error(messageText);
    } finally {
      setLoading(false);
    }
  };

  // 解析AI模型响应
  const parseAIResponse = (rawResponse: string): AssessmentResult => {
    try {
      // 尝试解析JSON格式
      if (rawResponse.trim().startsWith('{')) {
        const parsed = JSON.parse(rawResponse);
        return {
          risk_scores: parsed.risk_scores || [],
          missing_risks: parsed.missing_risks,
          overall_suggestion: parsed.overall_suggestion || 'AI评估完成',
          confidence: parsed.confidence,
        };
      }

      // 解析纯文本格式（简单的文本解析逻辑）
      const lines = rawResponse.split('\n').filter((line) => line.trim());
      const riskScores: RiskScoreSuggestion[] = [];
      let overallSuggestion = 'AI评估完成';

      for (const line of lines) {
        const riskMatch = line.match(
          /(.+?)[:：]\s*(\d+)\s*分.*?原因[:：]?\s*(.+)/,
        );
        if (riskMatch) {
          riskScores.push({
            item_name: riskMatch[1].trim(),
            suggested_score: parseInt(riskMatch[2]),
            reason: riskMatch[3].trim(),
          });
        }
      }

      if (riskScores.length === 0) {
        throw new Error('无法从AI响应中提取有效的风险评分数据');
      }

      return {
        risk_scores: riskScores,
        overall_suggestion: overallSuggestion,
      };
    } catch (error) {
      console.error('AI响应解析失败:', error);
      throw new Error('AI响应格式无法解析，请检查后端API返回格式');
    }
  };

  // 应用评估结果
  const handleApplyResult = async () => {
    if (!assessmentResult) {
      messageApi.error('没有可应用的评估结果');
      return;
    }
    try {
      // 无感调用名称归一
      const allowed = (riskItemConfigs || []).map((i) => i.item_name);
      const payload = {
        allowed_item_names: allowed,
        risk_scores: assessmentResult.risk_scores || [],
      };
      setApplyLoading(true);
      let effective = assessmentResult;
      try {
        const res = await normalizeRiskNames(payload);
        if (res?.success && res?.data?.parsed?.risk_scores?.length) {
          // 保留原始的 missing_risks，只更新 risk_scores
          effective = {
            ...res.data.parsed,
            missing_risks: assessmentResult.missing_risks,
          } as AiAssessmentResult;
        }
      } catch (e) {
        // 归一失败，回退原结果
      }
      onAssessmentComplete(effective);
      onClose();
      messageApi.success('AI评估结果已应用到风险评分表单');
    } finally {
      setApplyLoading(false);
    }
  };

  // 重置Modal状态
  const resetModalState = () => {
    setDocumentText('');
    setSelectedPrompt(null);
    setAssessmentResult(null);
    setLatestModel(null);
    // 表单会随 Modal 销毁而销毁，无需主动 reset
  };

  // Modal关闭时重置状态
  useEffect(() => {
    if (!visible) {
      resetModalState();
    } else {
      loadAvailablePrompts();
    }
  }, [visible]);

  

  

  // 表格列定义
  const riskScoreColumns: ColumnsType<RiskScoreSuggestion> = [
    {
      title: '风险项名称',
      dataIndex: 'item_name',
      key: 'item_name',
      width: '30%',
    },
    {
      title: '建议评分',
      dataIndex: 'suggested_score',
      key: 'suggested_score',
      width: '15%',
      render: (score: number) => (
        <span
          style={{
            color:
              score > 3
                ? RISK_LEVEL_COLORS.HIGH
                : score > 2
                  ? RISK_LEVEL_COLORS.MEDIUM
                  : RISK_LEVEL_COLORS.LOW,
          }}
        >
          {score}分
        </span>
      ),
    },
    {
      title: '评估理由',
      dataIndex: 'reason',
      key: 'reason',
    },
  ];

  return (
    <Modal
      className="ai-assessment-modal"
      title={
        <Space>
          <RobotOutlined />
          AI智能风险评估
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="assess"
          type="primary"
          onClick={handleAssessment}
          loading={loading}
          disabled={!documentText.trim() || !selectedPrompt || applyLoading}
          icon={<RobotOutlined />}
          className="ai-assessment-button assessment-start-button"
        >
          开始AI评估
        </Button>,
        <Button
          key="apply"
          type="primary"
          onClick={handleApplyResult}
          loading={applyLoading}
          disabled={!assessmentResult || applyLoading}
          icon={<BarChartOutlined />}
          className="ai-assessment-button assessment-apply-button"
        >
          应用评估结果
        </Button>,
      ]}
      destroyOnHidden
    >
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 项目文档输入区域 */}
        <Card size="small" className="document-input-section">
          <Title level={5} className="document-input-label">
            <FileTextOutlined />
            项目文档
          </Title>
          <TextArea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="请输入项目招标文件内容或项目要求描述..."
            maxLength={MAX_DOCUMENT_LENGTH}
            showCount
            rows={6}
            style={{ width: '100%' }}
          />
        </Card>

        {/* 提示词配置区域 */}
        <Card size="small" className="prompt-config-section">
          <Title level={5} className="prompt-config-label">
            <SettingOutlined />
            评估配置
          </Title>
          <Form form={form} layout="vertical">
            <Form.Item
              label="选择提示词模板"
              name="promptId"
              rules={[{ required: true, message: '请选择提示词模板' }]}
            >
              <Select
                placeholder={promptsLoading ? '正在加载提示词...' : '请选择提示词模板'}
                onChange={handlePromptChange}
                loading={promptsLoading}
                options={availablePrompts.map((prompt) => ({
                  value: prompt.id,
                  label: prompt.name,
                }))}
                allowClear
                disabled={promptsLoading || availablePrompts.length === 0}
              />
            </Form.Item>

            {availablePrompts.length === 0 && !promptsLoading && (
              <Alert
                type="warning"
                showIcon
                message="暂无可用提示词"
                description="请联系管理员在系统中配置AI提示词后再试。"
                style={{ marginBottom: 16 }}
              />
            )}

            {selectedPrompt?.content && (
              <Collapse
                ghost
                style={{ marginBottom: 16 }}
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

            <Form.Item label="模型信息">
              <Input
                value={
                  selectedPrompt?.model_hint ||
                  latestModel ||
                  '尚未选择模型'
                }
                disabled
                className="model-info-input"
                style={{ opacity: 0.7 }}
              />
            </Form.Item>

            {/* 提示词变量配置 */}
            {selectedPrompt?.variables &&
              selectedPrompt.variables.length > 0 && (
                <Card
                  size="small"
                  style={{ marginTop: 16 }}
                  className="prompt-variables-section"
                >
                  <Title level={5} className="prompt-variables-title">
                    提示词变量配置
                  </Title>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {selectedPrompt.variables.map((variable) => (
                      <Form.Item
                        key={variable.name}
                        label={variable.display_name || variable.name}
                        name={['variables', variable.name]}
                        tooltip={variable.description}
                        style={{ marginBottom: 16 }}
                      >
                        <Input
                          placeholder={
                            variable.default_value || '请输入变量值'
                          }
                        />
                      </Form.Item>
                    ))}
                  </Space>
                </Card>
              )}
          </Form>
        </Card>

        {/* 评估结果展示区域 */}
        <Card size="small" className="assessment-result-section">
          <Title level={5} className="assessment-result-title">
            <BarChartOutlined />
            评估结果
          </Title>

          {!assessmentResult && !loading && (
            <div className="result-placeholder">
              <Alert
                message="开始AI评估"
                description="请输入项目文档并选择提示词模板，然后点击'开始AI评估'按钮。"
                type="info"
                showIcon
              />
            </div>
          )}

          {loading && (
            <div
              style={{ textAlign: 'center', padding: '40px 0' }}
              className="result-loading"
            >
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                AI正在分析项目文档，评估风险项...
              </div>
            </div>
          )}

          {assessmentResult && (
            <Space
              direction="vertical"
              size="middle"
              style={{ width: '100%' }}
              className="result-section-enter"
            >
              

              {/* 风险项评分建议表格 */}
              <Card size="small" className="risk-scores-suggestion">
                <Title level={5}>🎯 风险项评分建议</Title>
                
                <Table
                  dataSource={assessmentResult.risk_scores}
                  columns={riskScoreColumns}
                  pagination={false}
                  rowKey="item_name"
                  size="small"
                />
              </Card>

              {/* 可能缺失的风险项 */}
              {assessmentResult.missing_risks &&
                assessmentResult.missing_risks.length > 0 && (
                  <div className="missing-risks-suggestion">
                    <Alert
                      message="⚠️ 可能缺失的风险项"
                      description={
                        <div>
                          {assessmentResult.missing_risks.map((risk, index) => (
                            <div key={index} className="missing-risk-item">
                              <Text strong className="risk-name">
                                {risk.item_name}
                              </Text>
                              <Text
                                type="secondary"
                                className="risk-description"
                              >
                                {' '}
                                - {risk.description}
                              </Text>
                            </div>
                          ))}
                        </div>
                      }
                      type="warning"
                      showIcon
                    />
                  </div>
                )}

              {/* 总体建议 */}
              <Card size="small" className="overall-suggestion">
                <Title level={5}>💡 总体建议</Title>
                <Text>{assessmentResult.overall_suggestion}</Text>
                {latestModel && (
                  <div className="model-used-info">
                    <Text type="secondary">模型：{latestModel}</Text>
                  </div>
                )}
                {assessmentResult.confidence !== undefined && (
                  <div className="confidence-info">
                    <Text type="secondary">
                      评估置信度:{' '}
                      {(assessmentResult.confidence * 100).toFixed(1)}%
                    </Text>
                  </div>
                )}
              </Card>
            </Space>
          )}
        </Card>
      </Space>
    </Modal>
  );
};

export default AIAssessmentModal;
