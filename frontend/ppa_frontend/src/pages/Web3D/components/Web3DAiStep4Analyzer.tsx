import { getCurrentVisionModel } from '@/services/aiModel';
import {
  analyzeWeb3dStep4WithAI,
  getWeb3dStep4Prompts,
} from '@/services/web3d';
import {
  InfoCircleOutlined,
  RobotOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { FormInstance, UploadFile, UploadProps } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

type RiskOption = {
  label: string;
  value: number;
};

type RiskSelectionState = Record<string, number | undefined>;

type Web3DAiStep4AnalyzerProps = {
  basicForm: FormInstance;
  riskItems: API_WEB3D.RiskItem[];
  riskSelections: RiskSelectionState;
  templates: API_WEB3D.WorkloadTemplate[];
  roles: API.RoleConfig[];
  onApplyRows: (rows: API_WEB3D.Step4AnalyzeRow[]) => void;
};

const categoryLabel: Record<string, string> = {
  data_processing: '数据处理',
  core_dev: '核心开发',
  business_logic: '业务逻辑',
  performance: '性能与兼容性',
};

const parseOptions = (optionsJson?: string): RiskOption[] => {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((opt) => {
        const label = opt?.label || opt?.name;
        const value = Number(opt?.value ?? opt?.score);
        if (!label || !Number.isFinite(value)) {
          return null;
        }
        return { label, value };
      })
      .filter(Boolean) as RiskOption[];
  } catch {
    return [];
  }
};

const matchesStep = (stepName: string | undefined, keywords: string[]) => {
  const text = String(stepName || '');
  return keywords.some((keyword) => text.includes(keyword));
};

const Web3DAiStep4Analyzer: React.FC<Web3DAiStep4AnalyzerProps> = ({
  basicForm,
  riskItems,
  riskSelections,
  templates,
  roles,
  onApplyRows,
}) => {
  const { message } = App.useApp();
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<API_WEB3D.Step4Prompt[]>(
    [],
  );
  const [selectedPromptId, setSelectedPromptId] = useState<string>();
  const [promptVariables, setPromptVariables] = useState<Record<string, string>>({});
  const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<API_WEB3D.Step4AnalyzeResult | null>(null);
  const [currentVisionModel, setCurrentVisionModel] = useState<API.AIModelConfig | null>(
    null,
  );

  const selectedPrompt = useMemo(
    () => availablePrompts.find((item) => item.id === selectedPromptId) || null,
    [availablePrompts, selectedPromptId],
  );

  useEffect(() => {
    const load = async () => {
      setLoadingPrompts(true);
      try {
        const [promptsRes, currentVisionRes] = await Promise.all([
          getWeb3dStep4Prompts(),
          getCurrentVisionModel().catch(() => ({ data: null })),
        ]);
        setAvailablePrompts(Array.isArray(promptsRes?.data) ? promptsRes.data : []);
        setCurrentVisionModel((currentVisionRes as any)?.data || null);
      } catch (error: any) {
        message.error(error?.message || '加载 Web3D Step4 AI 配置失败');
      } finally {
        setLoadingPrompts(false);
      }
    };

    load();
  }, [message]);

  const handlePromptChange = (promptId: string) => {
    setSelectedPromptId(promptId);
    const prompt = availablePrompts.find((item) => item.id === promptId);
    const nextVariables: Record<string, string> = {};
    (prompt?.variables || []).forEach((variable) => {
      nextVariables[variable.name] =
        variable.default_value !== undefined && variable.default_value !== null
          ? String(variable.default_value)
          : '';
    });
    setPromptVariables(nextVariables);
  };

  const buildRiskAnswers = (keywords: string[]) =>
    riskItems
      .filter((item) => matchesStep(item.step_name, keywords))
      .map((item) => {
        const selectedValue = riskSelections[item.item_name];
        const selectedOption = parseOptions(item.options_json).find(
          (option) => option.value === selectedValue,
        );
        return {
          item_id: item.id,
          item_name: item.item_name,
          step_name: item.step_name,
          description: item.description,
          weight: item.weight,
          selected_value: selectedValue,
          selected_label: selectedOption?.label,
        };
      });

  const contextPayload = useMemo<API_WEB3D.Step4AnalyzeContext>(() => {
    const basicValues = basicForm.getFieldsValue();
    const step1RiskAnswers = buildRiskAnswers(['项目背景', '技术']);
    const step2RiskAnswers = buildRiskAnswers(['数据资产', '数据']);
    const step3RiskAnswers = buildRiskAnswers(['开发需求', '开发']);
    const allRiskAnswers = [...step1RiskAnswers, ...step2RiskAnswers, ...step3RiskAnswers];
    const weightedRiskScore = allRiskAnswers.reduce((sum, item) => {
      const score = Number(item.selected_value || 0);
      const weight = Number(item.weight || 1);
      return sum + score * weight;
    }, 0);

    return {
      project_name: basicValues.name,
      project_description: basicValues.description,
      step1: {
        name: basicValues.name,
        description: basicValues.description,
        model_source: basicValues.model_source,
        model_source_note: basicValues.model_source_note,
        view_distance_range: basicValues.view_distance_range,
        target_terminals: basicValues.target_terminals,
        risk_answers: step1RiskAnswers,
      },
      step2: {
        risk_answers: step2RiskAnswers,
      },
      step3: {
        risk_answers: step3RiskAnswers,
      },
      risk_summary: {
        answered_count: allRiskAnswers.filter((item) => item.selected_value != null).length,
        total_item_count: allRiskAnswers.length,
        weighted_score: Number(weightedRiskScore.toFixed(2)),
      },
      workload_templates: templates,
      roles,
    };
  }, [basicForm, riskItems, riskSelections, roles, templates]);

  const contextPreview = useMemo(
    () => JSON.stringify(contextPayload, null, 2),
    [contextPayload],
  );

  const coverageStats = useMemo(() => {
    const coverage = analysisResult?.coverage || [];
    return coverage.reduce(
      (acc, item) => {
        acc[item.applicability] += 1;
        return acc;
      },
      {
        required: 0,
        optional: 0,
        not_applicable: 0,
      },
    );
  }, [analysisResult]);

  const unmappedSummary = useMemo(() => {
    const unmappedItems = analysisResult?.unmapped_items || [];
    const missingTemplateItems = analysisResult?.missing_template_items || [];
    return {
      unmappedCount: unmappedItems.length,
      missingCount: missingTemplateItems.length,
      displayNames: [
        ...unmappedItems.map((item) => `${item.category} / ${item.item_name}`),
        ...missingTemplateItems.map((item) => `${item.category} / ${item.item_name}`),
      ].slice(0, 8),
    };
  }, [analysisResult]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/')) {
      message.warning('只能上传图片文件');
      return Upload.LIST_IGNORE;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.warning('单张图片不能超过 5MB');
      return Upload.LIST_IGNORE;
    }

    if (imageFileList.length >= 3) {
      message.warning('最多只能上传 3 张图片');
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleAnalyze = async () => {
    if (!currentVisionModel) {
      message.warning('请先在模型管理中设置当前视觉模型');
      return;
    }

    if (!selectedPromptId) {
      message.warning('请先选择提示词模板');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('promptId', selectedPromptId);
      formData.append('variables_json', JSON.stringify(promptVariables || {}));
      formData.append('context_json', JSON.stringify(contextPayload));
      imageFileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('images', file.originFileObj);
        }
      });

      const result = await analyzeWeb3dStep4WithAI(formData);
      if (!result?.success || !result.data) {
        throw new Error((result as any)?.error || 'AI 分析失败');
      }

      setAnalysisResult(result.data);
      const mappedCount = result.data.step4_rows?.length || 0;
      const unmappedCount =
        (result.data.unmapped_items?.length || 0) +
        (result.data.missing_template_items?.length || 0);
      if (unmappedCount > 0) {
        message.warning(
          `AI 分析完成，已自动映射 ${mappedCount} 行，另有 ${unmappedCount} 项需要你手动处理`,
        );
      } else {
        message.success(
          `AI 分析完成，已覆盖评估 ${result.data.coverage?.length || 0} 个工作项`,
        );
      }
    } catch (error: any) {
      message.error(error?.message || 'AI 分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!analysisResult?.step4_rows?.length) {
      message.warning('当前没有可应用到 Step4 的结果');
      return;
    }

    Modal.confirm({
      title: '覆盖当前 Step4 工作量表',
      content: '应用后将用 AI 已匹配成功的工作量、角色、人天、交付系数和原因说明替换当前 Step4 表格。',
      okText: '确认覆盖',
      cancelText: '取消',
      onOk: () => {
        onApplyRows(analysisResult.step4_rows);
        message.success(`已覆盖 ${analysisResult.step4_rows.length} 条 Step4 工作量行`);
        const unmappedCount =
          (analysisResult.unmapped_items?.length || 0) +
          (analysisResult.missing_template_items?.length || 0);
        if (unmappedCount > 0) {
          message.warning(`仍有 ${unmappedCount} 项未自动映射，请在 Step4 表中手动补充`);
        }
      },
    });
  };

  const coverageColumns = [
    {
      title: '类别',
      dataIndex: 'category',
      width: 120,
      render: (value: string) => categoryLabel[value] || value,
    },
    {
      title: '工作项',
      dataIndex: 'item_name',
      width: 220,
    },
    {
      title: '评估结论',
      dataIndex: 'applicability',
      width: 110,
      render: (value: API_WEB3D.Step4AnalyzeCoverageItem['applicability']) => {
        if (value === 'required') return <Tag color="red">必做</Tag>;
        if (value === 'optional') return <Tag color="gold">可选</Tag>;
        return <Tag>不适用</Tag>;
      },
    },
    {
      title: '建议人天',
      dataIndex: 'recommended_base_days',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '交付系数',
      dataIndex: 'recommended_delivery_factor',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '建议角色',
      dataIndex: 'recommended_role_names',
      width: 220,
      render: (value: string[]) =>
        Array.isArray(value) && value.length ? value.join(' / ') : '-',
    },
    {
      title: '原因',
      dataIndex: 'reason',
      ellipsis: true,
    },
  ];

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          <span>AI 模块梳理</span>
        </Space>
      }
      extra={
        <Tooltip title="会把 Step1-3 表单、Web3D 工作量模板、角色配置和最多 3 张图片一并发送给 AI">
          <InfoCircleOutlined />
        </Tooltip>
      }
      loading={loadingPrompts}
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {currentVisionModel ? (
          <Alert
            type="info"
            message={`当前视觉模型：${currentVisionModel.config_name || currentVisionModel.model_name}`}
            description={`${currentVisionModel.provider} / ${currentVisionModel.model_name}`}
            showIcon
          />
        ) : (
          <Alert
            type="warning"
            message="当前未设置视觉模型"
            description="请先到模型管理中将一个 supports_vision 的模型设为当前视觉模型。"
            showIcon
          />
        )}

        <Form layout="vertical">
          <Form.Item label="提示词模板" required>
            <Select
              value={selectedPromptId}
              placeholder="请选择 Web3D Step4 分析模板"
              onChange={handlePromptChange}
              options={availablePrompts.map((prompt) => ({
                label: prompt.name,
                value: prompt.id,
              }))}
            />
          </Form.Item>

          {(selectedPrompt?.variables || []).length > 0 && (
            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedPrompt?.variables?.map((variable) => (
                <Form.Item
                  key={variable.name}
                  label={variable.display_name || variable.name}
                  extra={variable.description || undefined}
                >
                  <Input
                    value={promptVariables[variable.name]}
                    onChange={(event) =>
                      setPromptVariables((prev) => ({
                        ...prev,
                        [variable.name]: event.target.value,
                      }))
                    }
                  />
                </Form.Item>
              ))}
            </Space>
          )}

          <Form.Item
            label="参考图片"
            extra="支持 0-3 张图片，单张不超过 5MB。可点击上传、拖拽上传，或直接复制图片后在此处粘贴。合法图片会保留在列表中，点击“开始 AI 分析”时统一提交。"
          >
            <Upload
              accept="image/*"
              beforeUpload={beforeUpload}
              fileList={imageFileList}
              listType="picture-card"
              maxCount={3}
              pastable
              onChange={({ fileList }) => setImageFileList(fileList.slice(0, 3))}
            >
              {imageFileList.length >= 3 ? null : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>

        <Collapse
          items={[
            {
              key: 'context',
              label: '发送上下文预览',
              children: (
                <Input.TextArea
                  value={contextPreview}
                  autoSize={{ minRows: 8, maxRows: 20 }}
                  readOnly
                />
              ),
            },
          ]}
        />

        <Space>
          <Button
            type="primary"
            loading={analyzing}
            disabled={!currentVisionModel}
            onClick={handleAnalyze}
          >
            开始 AI 分析
          </Button>
          <Typography.Text type="secondary">
            结果会先预览，再决定是否覆盖 Step4。
          </Typography.Text>
        </Space>

        {analysisResult && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              type="success"
              showIcon
              message={analysisResult.summary || 'AI 已完成 Web3D Step4 评估'}
              description={
                <Space wrap>
                  <span>模型：{analysisResult.model_used || '-'}</span>
                  <span>耗时：{analysisResult.duration_ms || 0} ms</span>
                  <span>可应用行数：{analysisResult.step4_rows?.length || 0}</span>
                </Space>
              }
            />

            {(unmappedSummary.unmappedCount > 0 || unmappedSummary.missingCount > 0) && (
              <Alert
                type="warning"
                showIcon
                message={`已自动映射 ${analysisResult.step4_rows?.length || 0} 行，另有 ${
                  unmappedSummary.unmappedCount + unmappedSummary.missingCount
                } 项未自动映射`}
                description={
                  <Space direction="vertical" size={4}>
                    <span>未自动映射的项不会阻止你覆盖已匹配行，剩余部分可在 Step4 中手动补充。</span>
                    {unmappedSummary.displayNames.length > 0 && (
                      <span>示例：{unmappedSummary.displayNames.join('；')}</span>
                    )}
                  </Space>
                }
              />
            )}

            <Table<API_WEB3D.Step4AnalyzeCoverageItem>
              size="small"
              rowKey={(row) => `${row.category}::${row.item_name}`}
              pagination={false}
              scroll={{ x: 'max-content', y: 420 }}
              columns={coverageColumns}
              dataSource={analysisResult.coverage || []}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={coverageColumns.length}>
                      <Space wrap>
                        <Tag color="red">必做 {coverageStats.required}</Tag>
                        <Tag color="gold">可选 {coverageStats.optional}</Tag>
                        <Tag>不适用 {coverageStats.not_applicable}</Tag>
                      </Space>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />

            <Space>
              <Button type="primary" onClick={handleApply}>
                覆盖到 Step4
              </Button>
              <Typography.Text type="secondary">
                会把 AI 已匹配成功的 Step4 行及其原因说明应用到工作量表，未匹配项需要你手动处理。
              </Typography.Text>
            </Space>
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default Web3DAiStep4Analyzer;
