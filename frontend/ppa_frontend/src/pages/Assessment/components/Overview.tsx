import { calculateProjectCost, createProject } from '@/services/assessment';
import { getCurrentModel } from '@/services/aiModel';
import { compareData, getFieldLabel, formatValue } from '@/hooks/useAssessmentCache';
import { useAssessmentCache } from '@/hooks/useAssessmentCache';
import { InfoCircleOutlined, RobotOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import {
  ProForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Descriptions, Statistic, Tooltip, Row, Col, Tag, Alert, Progress, App, Modal } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';

type OverviewProps = {
  assessmentData: API.AssessmentData;
  configData: {
    risk_items: API.RiskItemConfig[];
    roles: API.RoleConfig[];
  };
  onPrev: () => void;
};

// AI使用情况数据类型定义
interface RiskAssessmentAIInfo {
  used: boolean;
  modelName?: string;
  modelProvider?: string;
  promptTemplate?: string;
  features?: string[];
  confidence?: number;
  usageTime?: string;
}

interface ModuleAnalysisAIInfo {
  used: boolean;
  modelName?: string;
  modelProvider?: string;
  promptTemplate?: string;
  features?: string[];
  modulesGenerated?: number;
  usageTime?: string;
}

interface WorkloadEvaluationAIInfo {
  moduleType: 'development' | 'integration';
  modulePath: string;
  moduleId: string;
  modelName?: string;
  modelProvider?: string;
  promptTemplate?: string;
  evaluatedRoles?: string[];
  usageTime?: string;
}

interface AIUsageInfo {
  riskAssessment: RiskAssessmentAIInfo | null;
  moduleAnalysis: ModuleAnalysisAIInfo | null;
  workloadEvaluations: WorkloadEvaluationAIInfo[];
  collectedAt: string;
}

interface CurrentModelInfo {
  name: string;
  provider: string;
}

// AI使用情况面板组件
interface AIUsagePanelProps {
  aiUsageInfo: AIUsageInfo;
  currentModelInfo?: CurrentModelInfo;
}

const AIUsagePanel: React.FC<AIUsagePanelProps> = ({ aiUsageInfo, currentModelInfo }) => {
  const [allModulesVisible, setAllModulesVisible] = useState(false);
  const resolvedModelName = currentModelInfo?.name || '未配置模型';
  const resolvedModelProvider = currentModelInfo?.provider || '未配置供应商';

  const totalAiUsage = (aiUsageInfo.riskAssessment ? 1 : 0) + 
                       (aiUsageInfo.moduleAnalysis ? 1 : 0) + 
                       aiUsageInfo.workloadEvaluations.length;

  const renderEvaluationItem = (
    evaluation: WorkloadEvaluationAIInfo,
    index: number,
    variant: 'compact' | 'full' = 'compact',
  ) => {
    const baseKey = evaluation.moduleId || `${evaluation.modulePath}-${index}`;
    const containerStyle = {
      display: 'flex',
      alignItems: 'center',
      padding: variant === 'compact' ? 12 : 16,
      background: variant === 'compact' ? '#fafafa' : '#fff',
      borderRadius: 8,
      marginBottom: 8,
      border: variant === 'compact' ? undefined : '1px solid #f0f0f0',
      boxShadow:
        variant === 'compact'
          ? undefined
          : '0 2px 6px rgba(0, 0, 0, 0.06)',
    } as React.CSSProperties;

    const moduleTypeLabel =
      evaluation.moduleType === 'development' ? '新功能开发' : '系统对接';
    const moduleTypeColor =
      evaluation.moduleType === 'development' ? 'blue' : 'purple';

    return (
      <div key={`${baseKey}-${variant}`} style={containerStyle}>
        <span style={{ fontSize: 16, marginRight: 12, color: '#fa8c16' }}>⚡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {evaluation.modulePath || '未命名模块'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag color={moduleTypeColor} style={{ margin: 0 }}>
              {moduleTypeLabel}
            </Tag>
            {evaluation.evaluatedRoles?.map((role, roleIndex) => (
              <Tag key={`${baseKey}-role-${roleIndex}-${variant}`} color="green" style={{ margin: 0 }}>
                {role}
              </Tag>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'right' }}>
          {evaluation.usageTime
            ? new Date(evaluation.usageTime).toLocaleString('zh-CN')
            : '-'}
        </div>
      </div>
    );
  };

  // 未使用AI的空状态显示
  if (totalAiUsage === 0) {
    return (
      <Card 
        className="ai-usage-empty"
        style={{ 
          border: '2px solid #f6ffed',
          background: '#f6ffed',
          borderRadius: 12
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <InfoCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <h3 style={{ color: '#52c41a', margin: 0 }}>🤖 AI模型使用情况</h3>
          <p style={{ color: '#52c41a', margin: '8px 0 0 0', fontSize: 14 }}>
            本次评估未使用AI辅助功能，所有数据均来自手动输入
          </p>
        </div>
      </Card>
    );
  }

  // 使用了AI的完整面板显示
  return (
    <Card 
      className="ai-usage-panel"
      style={{ 
        border: '2px solid #e6f7ff',
        background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)',
        borderRadius: 12
      }}
    >
      {/* AI使用概况统计 */}
      <div className="ai-usage-summary" style={{
        // display: 'flex',
        display:"none",
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        background: 'white',
        borderRadius: 8,
        marginBottom: 24,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="usage-stats">
          <Statistic
            title="AI辅助环节"
            value={totalAiUsage}
            suffix="个环节"
            prefix={<RobotOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff' }}
          />
        </div>
        <div className="usage-time" style={{ textAlign: 'right' }}>
          <ClockCircleOutlined style={{ color: '#8c8c8c', marginRight: 8 }} />
          <span style={{ color: '#8c8c8c', fontSize: 14 }}>
            最后更新: {new Date(aiUsageInfo.collectedAt).toLocaleString('zh-CN')}
          </span>
        </div>
      </div>

      {/* AI使用详情 */}
      <div className="ai-usage-details">
        {/* 风险评估AI使用情况 */}
        {aiUsageInfo.riskAssessment && (
          <div className="ai-usage-item" style={{
            marginBottom: 24,
            padding: 20,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e8e8e8',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <div className="usage-header" style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span className="usage-icon" style={{ fontSize: 24, marginRight: 12, color: '#722ed1' }}>📊</span>
              <div className="usage-info">
                <h4 style={{ margin: 0, color: '#262626' }}>风险评估环节</h4>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">{aiUsageInfo.riskAssessment.modelName}</Tag>
                  <Tag color="geekblue">{aiUsageInfo.riskAssessment.modelProvider}</Tag>
                </div>
              </div>
            </div>
            <div className="usage-features" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {aiUsageInfo.riskAssessment.features?.map((feature, index) => (
                <Tag key={index} color="blue" style={{ margin: 0 }}>{feature}</Tag>
              ))}
            </div>
            <div className="usage-details">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="提示词模板">
                  {aiUsageInfo.riskAssessment.promptTemplate}
                </Descriptions.Item>
                <Descriptions.Item label="置信度">
                  <Progress percent={Math.round((aiUsageInfo.riskAssessment.confidence || 0) * 100)} size="small" />
                </Descriptions.Item>
                <Descriptions.Item label="使用时间" span={2}>
                  {aiUsageInfo.riskAssessment.usageTime ? new Date(aiUsageInfo.riskAssessment.usageTime).toLocaleString('zh-CN') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}

        {/* 模块分析AI使用情况 */}
        {aiUsageInfo.moduleAnalysis && (
          <div className="ai-usage-item" style={{
            marginBottom: 24,
            padding: 20,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e8e8e8',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <div className="usage-header" style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span className="usage-icon" style={{ fontSize: 24, marginRight: 12, color: '#13c2c2' }}>🧩</span>
              <div className="usage-info">
                <h4 style={{ margin: 0, color: '#262626' }}>模块梳理环节</h4>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">{aiUsageInfo.moduleAnalysis.modelName}</Tag>
                  <Tag color="geekblue">{aiUsageInfo.moduleAnalysis.modelProvider}</Tag>
                </div>
              </div>
            </div>
            <div className="usage-features" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {aiUsageInfo.moduleAnalysis.features?.map((feature, index) => (
                <Tag key={index} color="blue" style={{ margin: 0 }}>{feature}</Tag>
              ))}
            </div>
            <div className="usage-details">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="提示词模板">
                  {aiUsageInfo.moduleAnalysis.promptTemplate}
                </Descriptions.Item>
                <Descriptions.Item label="生成模块数">
                  <Statistic value={aiUsageInfo.moduleAnalysis.modulesGenerated} suffix="个模块" />
                </Descriptions.Item>
                <Descriptions.Item label="使用时间" span={2}>
                  {aiUsageInfo.moduleAnalysis.usageTime ? new Date(aiUsageInfo.moduleAnalysis.usageTime).toLocaleString('zh-CN') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}

        {/* 工作量评估AI使用情况 */}
        {aiUsageInfo.workloadEvaluations.length > 0 && (
          <div className="ai-usage-item" style={{
            marginBottom: 24,
            padding: 20,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e8e8e8',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <div className="usage-header" style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span className="usage-icon" style={{ fontSize: 24, marginRight: 12, color: '#fa8c16' }}>⚡</span>
              <div className="usage-info">
                <h4 style={{ margin: 0, color: '#262626' }}>工作量评估环节</h4>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">{resolvedModelName}</Tag>
                  <Tag color="geekblue">{resolvedModelProvider}</Tag>
                  <Statistic 
                    value={aiUsageInfo.workloadEvaluations.length} 
                    suffix="已评估模块" 
                    style={{ display: 'inline-block', marginLeft: 16 }}
                  />
                </div>
              </div>
            </div>
            <div className="workload-evaluation-list">
              {aiUsageInfo.workloadEvaluations
                .slice(0, 5)
                .map((evaluation, index) =>
                  renderEvaluationItem(evaluation, index, 'compact'),
                )}
              {aiUsageInfo.workloadEvaluations.length > 5 && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Button type="link" size="small" onClick={() => setAllModulesVisible(true)}>
                    查看全部 {aiUsageInfo.workloadEvaluations.length} 个模块
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 透明性说明 */}
      <div className="ai-usage-footer" style={{ marginTop: 24,display:'none' }}>
        <Alert
          message="以上AI辅助记录确保评估过程的透明性和可追溯性。所有AI建议仅供参考，最终决策由评估人员确认。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          closable
          style={{ borderRadius: 8 }}
        />
      </div>

      <Modal
        title="全部 AI 评估模块"
        open={allModulesVisible}
        onCancel={() => setAllModulesVisible(false)}
        width={900}
        footer={[
          <Button key="close" type="primary" onClick={() => setAllModulesVisible(false)}>
            知道了
          </Button>,
        ]}
        destroyOnHidden
      >
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {aiUsageInfo.workloadEvaluations.map((evaluation, index) =>
            renderEvaluationItem(evaluation, index, 'full'),
          )}
          {aiUsageInfo.workloadEvaluations.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
              暂无 AI 评估模块
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

const Overview: React.FC<OverviewProps> = ({
  assessmentData,
  configData,
  onPrev,
}) => {
  const { message } = App.useApp();
  const { getLatest } = useAssessmentCache();
  const [calculationResult, setCalculationResult] =
    useState<API.CalculationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentModel, setCurrentModel] = useState<API.AIModelConfig | null>(null);
  const [aiUsageInfo, setAiUsageInfo] = useState<AIUsageInfo>({
    riskAssessment: null,
    moduleAnalysis: null,
    workloadEvaluations: [],
    collectedAt: new Date().toISOString()
  });
  const preciseTotal = calculationResult
    ? calculationResult.total_cost_exact ?? calculationResult.total_cost
    : 0;
  const currentModelInfo = useMemo<CurrentModelInfo>(() => {
    if (currentModel) {
      return {
        name:
          currentModel.model_name ||
          currentModel.config_name ||
          '未命名模型',
        provider: currentModel.provider || '未配置供应商',
      };
    }
    return { name: '未配置模型', provider: '未配置供应商' };
  }, [currentModel]);

  useEffect(() => {
    const loadCurrentModel = async () => {
      try {
        const result = await getCurrentModel();
        if (result?.data) {
          setCurrentModel(result.data);
        }
      } catch (error) {
        console.error('获取当前模型失败:', error);
      }
    };

    loadCurrentModel();
  }, []);

  // 收集AI使用信息的函数
  const collectAIUsageInfo = () => {
    const usageInfo: AIUsageInfo = {
      riskAssessment: null,
      moduleAnalysis: null,
      workloadEvaluations: [],
      collectedAt: new Date().toISOString()
    };
    const resolvedModelName = currentModelInfo.name;
    const resolvedModelProvider = currentModelInfo.provider;

    // 收集风险评估AI使用信息
    if (assessmentData.ai_assessment_result) {
      usageInfo.riskAssessment = {
        used: true,
        modelName: resolvedModelName,
        modelProvider: resolvedModelProvider,
        promptTemplate: assessmentData.ai_assessment_result.prompt_name || '风险评估模板',
        features: ['风险项评分建议', '缺失风险项识别', '总体建议'],
        confidence: assessmentData.ai_assessment_result.confidence || 0.85,
        usageTime: assessmentData.ai_assessment_result.timestamp
      };
    }

    // 收集模块分析AI使用信息
    if (assessmentData.ai_module_analysis) {
      usageInfo.moduleAnalysis = {
        used: true,
        modelName: resolvedModelName,
        modelProvider: resolvedModelProvider,
        promptTemplate: assessmentData.ai_module_analysis.prompt_name || '模块分析模板',
        features: ['项目需求分析', '模块结构生成', '复杂度评估'],
        modulesGenerated: assessmentData.ai_module_analysis.modules_count || 0,
        usageTime: assessmentData.ai_module_analysis.timestamp
      };
    }

    // 收集工作量评估AI使用信息
    if (assessmentData.development_workload) {
      assessmentData.development_workload.forEach(module => {
        if (module.ai_evaluation_result?.used) {
          usageInfo.workloadEvaluations.push({
            moduleType: 'development',
            modulePath: `${module.module1}/${module.module2}/${module.module3}`,
            moduleId: module.id,
            modelName:
              module.ai_evaluation_result.modelName || resolvedModelName,
            modelProvider:
              module.ai_evaluation_result.modelProvider ||
              resolvedModelProvider,
            promptTemplate: module.ai_evaluation_result.promptTemplate,
            evaluatedRoles: module.ai_evaluation_result.evaluatedRoles,
            usageTime: module.ai_evaluation_result.timestamp
          });
        }
      });
    }

    if (assessmentData.integration_workload) {
      assessmentData.integration_workload.forEach(module => {
        if (module.ai_evaluation_result?.used) {
          usageInfo.workloadEvaluations.push({
            moduleType: 'integration',
            modulePath: `${module.module1}/${module.module2}/${module.module3}`,
            moduleId: module.id,
            modelName:
              module.ai_evaluation_result.modelName || resolvedModelName,
            modelProvider:
              module.ai_evaluation_result.modelProvider ||
              resolvedModelProvider,
            promptTemplate: module.ai_evaluation_result.promptTemplate,
            evaluatedRoles: module.ai_evaluation_result.evaluatedRoles,
            usageTime: module.ai_evaluation_result.timestamp
          });
        }
      });
    }

    setAiUsageInfo(usageInfo);
  };

  // 使用useEffect收集AI使用信息
  useEffect(() => {
    collectAIUsageInfo();
  }, [assessmentData, currentModelInfo]);

  const handleCalculate = async () => {
    try {
      const payload: API.CalculateParams = {
        ...assessmentData,
        roles: configData.roles,
      };

      const result = await calculateProjectCost(payload);
      setCalculationResult(result.data);
      message.success('报价计算成功');
    } catch (error) {
      console.error('计算报价失败:', error);
      message.error('计算报价失败，请检查输入数据');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={onPrev}>上一步</Button>
      </div>
      <Button
        type="primary"
        onClick={handleCalculate}
        style={{ marginBottom: 24 }}
      >
        计算最新报价
      </Button>
      {calculationResult && (
        <>
          <Descriptions bordered column={3}>
            <Descriptions.Item label="软件研发成本" span={2}>
              <Statistic
                value={calculationResult.software_dev_cost}
                suffix="万元"
                precision={2}
              />
            </Descriptions.Item>
            <Descriptions.Item label="研发工作量" span={1}>
              <Statistic
                value={calculationResult.software_dev_workload_days}
                suffix="人天"
              />
            </Descriptions.Item>
            <Descriptions.Item label="系统对接成本" span={2}>
              <Statistic
                value={calculationResult.system_integration_cost}
                suffix="万元"
                precision={2}
              />
            </Descriptions.Item>
            <Descriptions.Item label="对接工作量" span={1}>
              <Statistic
                value={calculationResult.system_integration_workload_days}
                suffix="人天"
              />
            </Descriptions.Item>
            <Descriptions.Item label="差旅成本" span={3}>
              <Statistic
                value={calculationResult.travel_cost}
                suffix="万元"
                precision={2}
              />
            </Descriptions.Item>
            <Descriptions.Item label="运维成本" span={2}>
              <Statistic
                value={calculationResult.maintenance_cost}
                suffix="万元"
                precision={2}
              />
            </Descriptions.Item>
            <Descriptions.Item label="运维工作量" span={1}>
              <Statistic
                value={calculationResult.maintenance_workload_days}
                suffix="人天"
              />
            </Descriptions.Item>
            <Descriptions.Item label="风险成本" span={3}>
              <Statistic
                value={calculationResult.risk_cost}
                suffix="万元"
                precision={2}
              />
            </Descriptions.Item>
            <Descriptions.Item label="实施成本" span={2}>
              <Tooltip title={`精确实施成本 ${preciseTotal.toFixed(2)} 万元`}>
                <Statistic
                  value={calculationResult.total_cost}
                  suffix="万元"
                  precision={0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Tooltip>
            </Descriptions.Item>
            <Descriptions.Item label="总工作量" span={1}>
              <Statistic
                value={calculationResult.total_workload_days}
                suffix="人天"
                valueStyle={{ color: '#1890ff' }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="评分因子" span={3}>
              <Tooltip
                title={`当前风险得分合计 ${
                  calculationResult.risk_score
                }，占配置上限 ${(
                  (calculationResult.rating_ratio ?? 0) * 100
                ).toFixed(1)}%。`}
              >
                <Statistic
                  value={calculationResult.rating_factor}
                  precision={2}
                  suffix={<InfoCircleOutlined style={{ marginLeft: 8 }} />}
                />
              </Tooltip>
            </Descriptions.Item>
            <Descriptions.Item label="风险得分上限" span={3}>
              <Statistic value={calculationResult.risk_max_score} />
            </Descriptions.Item>
          </Descriptions>
          
          {/* AI使用情况标注面板 */}
          <div className="ai-usage-annotation" style={{ marginTop: 24 }}>
          <AIUsagePanel aiUsageInfo={aiUsageInfo} currentModelInfo={currentModelInfo} />
          </div>

          <ProForm
            onFinish={async (values) => {
              try {
                setSubmitting(true);

                // 数据一致性校验：对比当前数据与最后一次缓存
                const latestRecord = await getLatest();
                if (latestRecord) {
                  const diff = compareData(
                    {
                      risk_scores: assessmentData.risk_scores,
                      ai_unmatched_risks: assessmentData.ai_unmatched_risks,
                      custom_risk_items: assessmentData.custom_risk_items,
                      development_workload: assessmentData.development_workload,
                      integration_workload: assessmentData.integration_workload,
                      travel_months: assessmentData.travel_months,
                      travel_headcount: assessmentData.travel_headcount,
                      maintenance_months: assessmentData.maintenance_months,
                      maintenance_headcount: assessmentData.maintenance_headcount,
                      maintenance_daily_cost: assessmentData.maintenance_daily_cost,
                      risk_cost_items: assessmentData.risk_cost_items,
                      formValues: {},
                    },
                    latestRecord.data
                  );

                  if (diff.hasDifferences) {
                    return new Promise((resolve) => {
                      Modal.confirm({
                        title: '检测到未保存的变更',
                        icon: <ExclamationCircleOutlined />,
                        width: 600,
                        content: (
                          <div>
                            <p>当前页面数据与最后一次自动保存的草稿存在差异：</p>
                            <ul style={{ maxHeight: 300, overflow: 'auto' }}>
                              {diff.details.map((item, idx) => (
                                <li key={idx}>
                                  <strong>{getFieldLabel(item.field)}</strong>
                                  {item.type === 'added'
                                    ? '：新增了数据'
                                    : item.type === 'changed'
                                      ? `：从 ${formatValue(item.cachedValue)} 变更为 ${formatValue(item.currentValue)}`
                                      : '：删除了数据'}
                                </li>
                              ))}
                            </ul>
                            <p style={{ marginTop: 16, color: '#faad14' }}>
                              建议：先点击"重新保存草稿"更新缓存，或选择"强制保存"使用当前数据
                            </p>
                          </div>
                        ),
                        okText: '重新保存草稿',
                        cancelText: '强制保存',
                        onOk: async () => {
                          // 重新保存草稿
                          message.success('正在重新保存草稿...');
                          setSubmitting(false);
                          resolve(false); // 阻断保存
                          return Promise.reject(); // 阻止Modal自动关闭
                        },
                        onCancel: async () => {
                          // 继续执行保存
                          try {
                            const payload: API.CreateProjectParams = {
                              name: values.projectName,
                              description: values.projectDescription,
                              is_template: values.is_template || false,
                              assessmentData: {
                                ...assessmentData,
                                roles: configData.roles,
                              },
                            };

                            const result = await createProject(payload);
                            console.log('项目保存成功，ID:', result.id);
                            message.success('项目保存成功');

                            setTimeout(() => {
                              history.push('/assessment/history');
                            }, 500);

                            resolve(true);
                          } catch (error: any) {
                            console.error('保存项目失败:', error);
                            message.error(error.message || '保存项目失败，请稍后重试');
                            resolve(false);
                          } finally {
                            setSubmitting(false);
                          }
                        },
                      });
                    });
                  }
                }

                // 没有差异，直接保存
                const payload: API.CreateProjectParams = {
                  name: values.projectName,
                  description: values.projectDescription,
                  is_template: values.is_template || false,
                  assessmentData: {
                    ...assessmentData,
                    roles: configData.roles,
                  },
                };

                const result = await createProject(payload);
                console.log('项目保存成功，ID:', result.id);
                message.success('项目保存成功');

                // 延迟跳转，确保用户看到成功提示
                setTimeout(() => {
                  history.push('/assessment/history');
                }, 500);

                return true;
              } catch (error: any) {
                console.error('保存项目失败:', error);
                message.error(error.message || '保存项目失败，请稍后重试');
                return false;
              } finally {
                setSubmitting(false);
              }
            }}
            submitter={{
              searchConfig: { submitText: '保存项目' },
              submitButtonProps: {
                loading: submitting,
              },
            }}
            style={{ marginTop: 24 }}
          >
            <ProFormText
              name="projectName"
              label="项目名称"
              rules={[{ required: true, message: '请输入项目名称' }]}
            />
            <ProFormText name="projectDescription" label="项目描述" />
            <ProFormCheckbox name="is_template">另存为模板</ProFormCheckbox>
          </ProForm>
        </>
      )}
    </div>
  );
};

export default Overview;
