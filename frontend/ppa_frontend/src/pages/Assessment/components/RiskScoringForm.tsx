import { parseRiskOptions } from '@/utils/rating';
import { getAllProjects, getProjectDetail } from '@/services/assessment';
import { InfoCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { ProForm, ProFormSelect } from '@ant-design/pro-components';
import type { FormInstance } from 'antd';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
} from 'antd';
import React from 'react';
import AIAssessmentModal from './AIAssessmentModal';

type RiskScoringFormProps = {
  form: FormInstance;
  initialValues: API.AssessmentData;
  configData: {
    risk_items: API.RiskItemConfig[];
    roles: API.RoleConfig[];
  } | null;
  onValuesChange: (
    changedValues: Record<string, unknown>,
    allValues: Partial<API.AssessmentData>,
  ) => void;
  onNext: () => void;
  onAIAssessmentComplete: (result: any) => void;
};

const RiskScoringForm: React.FC<RiskScoringFormProps> = ({
  form,
  initialValues,
  configData,
  onValuesChange,
  onNext,
  onAIAssessmentComplete,
}) => {
  const { message } = App.useApp();
  // AI评估相关的状态
  const [aiAssessmentVisible, setAiAssessmentVisible] = React.useState(false);
  const [fillingFromTemplate, setFillingFromTemplate] =
    React.useState(false);
  const riskScoresWatch = Form.useWatch<Record<string, number | string | undefined>>(
    'risk_scores',
    form,
  );
  const currentRiskScores = React.useMemo(
    () => riskScoresWatch ?? initialValues?.risk_scores ?? {},
    [initialValues, riskScoresWatch],
  );

  const handleFormValuesChange = React.useCallback(
    (
      changedValues: Record<string, unknown>,
      allValues: Partial<API.AssessmentData>,
    ) => {
      onValuesChange(changedValues, allValues);
    },
    [onValuesChange],
  );
  const handleFillFromTemplate = async () => {
    try {
      setFillingFromTemplate(true);

      // 1. 获取当前模板项目
      const listResult = await getAllProjects({
        params: { is_template: 1 },
      });
      const projects = Array.isArray(listResult?.data)
        ? listResult.data
        : [];
      const templateProject = projects.find((p) => p.is_template === 1) || projects[0];

      if (!templateProject) {
        message.warning(
          '当前没有可用模板，请先在评估第四步勾选“同时保存为评估模板”后再试。',
        );
        return;
      }

      // 2. 加载模板详情并解析评估数据
      const detailResult = await getProjectDetail(
        String(templateProject.id),
      );
      const rawJson = detailResult?.data?.assessment_details_json;
      if (!rawJson) {
        message.warning('当前模板没有可用的评估数据');
        return;
      }

      let parsed: Partial<API.AssessmentData>;
      try {
        parsed = JSON.parse(rawJson) as Partial<API.AssessmentData>;
      } catch (error) {
        console.error('解析模板评估数据失败:', error);
        message.error('解析模板评估数据失败，请检查模板配置');
        return;
      }

      const templateRiskScores =
        parsed.risk_scores || {};
      if (
        !templateRiskScores ||
        Object.keys(templateRiskScores).length === 0
      ) {
        message.warning('模板中没有风险评分数据');
        return;
      }

      // 3. 仅填充当前配置中存在的风险项
      const mappedScores: Record<string, number | string> = {};
      const riskItems = configData?.risk_items ?? [];
      if (riskItems.length === 0) {
        message.warning('当前风险配置为空，无法从模板填充');
        return;
      }

      riskItems.forEach((item) => {
        const value = templateRiskScores[item.item_name];
        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          mappedScores[item.item_name] = value as
            | number
            | string;
        }
      });

      if (Object.keys(mappedScores).length === 0) {
        message.warning(
          '模板中的风险评分与当前配置不匹配，未找到可填充的风险项',
        );
        return;
      }

      form.setFieldsValue({ risk_scores: mappedScores });
      handleFormValuesChange(
        {},
        { risk_scores: mappedScores },
      );

      message.success(
        `已根据模板“${detailResult.data.name}”填充风险评分`,
      );
    } catch (error) {
      console.error('从模板填充风险评分失败:', error);
      message.error('从模板填充风险评分失败，请稍后重试');
    } finally {
      setFillingFromTemplate(false);
    }
  };

  const formatChineseLabel = React.useCallback((text: string) => {
    if (!text) return text;
    const matches = text.match(/[\u4e00-\u9fa5]+/g);
    if (!matches) return text;
    return matches.join('');
  }, []);

  const renderExtraRiskList = (
    name: string,
    title: string,
    extra: React.ReactNode,
    scoreRange: { min: number; max: number },
    placeholder: string
  ) => (
    <Card size="small" style={{ marginTop: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>{title}</span>
        <div style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>{extra}</div>
      </div>
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(field => (
              <Space
                key={field.key}
                align="baseline"
                style={{ display: 'flex', marginBottom: 8, width: '100%' }}
              >
                <Form.Item
                  name={[field.name, 'description']}
                  rules={[{ required: true, message: '请输入风险描述' }]}
                  style={{ flex: 1.2, minWidth: 240 }}
                >
                  <Input placeholder={placeholder} />
                </Form.Item>
                <Form.Item
                  name={[field.name, 'score']}
                  rules={[
                    { required: true, message: '请输入评分' },
                    {
                      type: 'number',
                      min: scoreRange.min,
                      max: scoreRange.max,
                      message: `评分需在 ${scoreRange.min}-${scoreRange.max} 之间`,
                    },
                  ]}
                >
                  <InputNumber
                    placeholder="评分"
                    min={scoreRange.min}
                    max={scoreRange.max}
                    style={{ width: 96, minWidth: 80 }}
                  />
                </Form.Item>
                <Button onClick={() => remove(field.name)}>删除</Button>
              </Space>
            ))}
            <Button type="dashed" onClick={() => add()} block>
              新增
            </Button>
          </>
        )}
      </Form.List>
    </Card>
  );

  return (
    <>
      <ProForm
        form={form}
        layout="vertical"
        grid
        rowProps={{ gutter: 16 }}
        colon={false}
        onValuesChange={handleFormValuesChange}
        initialValues={initialValues}
        onFinish={async () => {
          onNext();
          return true;
        }}
        submitter={{
          searchConfig: { submitText: '下一步' },
          render: (_, dom) => (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space>
                <Button
                  onClick={handleFillFromTemplate}
                  loading={fillingFromTemplate}
                >
                  从模板一键填充
                </Button>
                {dom}
              </Space>
            </div>
          ),
        }}
      >
        {(configData?.risk_items ?? []).map((item) => (
          <ProFormSelect
            key={item.id}
            name={['risk_scores', item.item_name]}
            label={formatChineseLabel(item.item_name)}
            placeholder="请选择风险评分"
            colProps={{ span: 6 }}
            options={parseRiskOptions(item.options_json)}
            rules={[{ required: true, message: '此项为必选项' }]}
          />
        ))}
        <Divider />

        <Row gutter={16} style={{ marginTop: 8, width: '100%', marginBottom: 16 }}>
          <Col xs={24} md={12}>
            {/* 自定义风险项 */}
            {renderExtraRiskList(
              'custom_risk_items',
              '自定义风险项',
              '评分范围 10~100，支持新增/删除',
              { min: 10, max: 100 },
              '请输入风险描述'
            )}
          </Col>
          <Col xs={24} md={12}>
            {/* AI智能风险评估区域 & 未匹配风险项列表 */}
            <Card
              size="small"
              style={{
                marginTop: 16,
                border: '1px solid #d9d9d9',
                backgroundColor: '#fafafa',
                height: '100%',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}
              >
                <RobotOutlined
                  style={{ fontSize: 18, color: '#1890ff', marginRight: 8 }}
                />
                <span style={{ fontSize: 16, fontWeight: 500 }}>AI智能风险评估</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <InfoCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                <span style={{ color: '#666' }}>
                  使用当前配置的模型进行智能评估，应用评估结果会覆盖当前风险评分数据。
                </span>
              </div>

              <Button
                type="primary"
                icon={<RobotOutlined />}
                size="large"
                onClick={() => setAiAssessmentVisible(true)}
                className="ai-assessment-button"
                style={{ width: '100%' }}
              >
                一键AI评估
              </Button>

              <Divider />
              <div style={{ marginBottom: 8, fontWeight: 500 }}>AI 未匹配风险项</div>
              <Form.List name="ai_unmatched_risks">
                {(fields, { add: _add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Space
                        key={field.key}
                        align="baseline"
                        style={{ display: 'flex', marginBottom: 8, width: '100%' }}
                      >
                        <Form.Item
                          name={[field.name, 'description']}
                          rules={[{ required: true, message: '请输入风险描述' }]}
                          style={{ flex: 1 }}
                        >
                          <Input placeholder="AI 未匹配的风险描述" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'score']}
                          rules={[
                            { required: true, message: '请输入评分' },
                            {
                              type: 'number',
                              min: 0,
                              max: 100,
                              message: '评分需在 0-100 之间',
                            },
                          ]}
                        >
                      <InputNumber
                        min={0}
                        max={100}
                        placeholder="评分"
                        style={{ width: 96, minWidth: 80 }}
                      />
                    </Form.Item>
                        <Button onClick={() => remove(field.name)}>删除</Button>
                      </Space>
                    ))}
                  </>
                )}
              </Form.List>
            </Card>
          </Col>
        </Row>
      </ProForm>

      {/* AI评估弹窗 */}
      <AIAssessmentModal
        visible={aiAssessmentVisible}
        onClose={() => setAiAssessmentVisible(false)}
        onAssessmentComplete={onAIAssessmentComplete}
        currentRiskItems={currentRiskScores}
        riskItemConfigs={configData?.risk_items ?? []}
      />
    </>
  );
};

export default RiskScoringForm;
