import { parseRiskOptions } from '@/utils/rating';
import { getAllProjects, getProjectDetail } from '@/services/assessment';
import { InfoCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { ProForm, ProFormSelect } from '@ant-design/pro-components';
import type { FormInstance } from 'antd';
import { App, Button, Card, Form, Space } from 'antd';
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
      </ProForm>

      {/* AI智能风险评估区域 */}
      <Card
        style={{
          marginTop: 24,
          border: '1px solid #d9d9d9',
          backgroundColor: '#fafafa',
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
        >
          一键AI评估
        </Button>
      </Card>

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
