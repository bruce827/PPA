import { AI_PROVIDER_LABELS } from '@/constants';
import { InfoCircleOutlined, SearchOutlined, RobotOutlined, SettingOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { EditableProTable } from '@ant-design/pro-components';
import { App, Button, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Space, Tabs, Tag, Tooltip } from 'antd';
import type { Key } from 'react';
import React, { useEffect, useState } from 'react';
import ProjectModuleAnalyzer from './ProjectModuleAnalyzer';
import WorkloadEvaluationModal from './WorkloadEvaluationModal';
import WorkloadPromptSelectorModal from './WorkloadPromptSelectorModal';
import {
  evaluateWorkload as aiEvaluateWorkload,
  getAllProjects,
  getProjectDetail,
  type AiPrompt,
} from '@/services/assessment';

type WorkloadEstimationProps = {
  configData: {
    risk_items: API.RiskItemConfig[];
    roles: API.RoleConfig[];
  };
  initialValues: {
    dev: API.WorkloadRecord[];
    integration: API.WorkloadRecord[];
  };
  onWorkloadChange: (
    dev: API.WorkloadRecord[],
    integration: API.WorkloadRecord[],
  ) => void;
  onPrev: () => void;
  onNext: () => void;
};

const WorkloadEstimation: React.FC<WorkloadEstimationProps> = ({
  configData,
  initialValues,
  onWorkloadChange,
  onPrev,
  onNext,
}) => {
  const { message } = App.useApp();
  const roles = configData.roles ?? [];

  const calculateWorkload = (values: Record<string, any>) => {
    let totalRoleDays = 0;
    roles.forEach((role) => {
      const days = Number(values[role.role_name] || 0);
      totalRoleDays += days;
    });
    return totalRoleDays * (Number(values.delivery_factor) || 1);
  };

  const createRowId = () =>
    `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  const normalizeRow = (row: API.WorkloadRecord): API.WorkloadRecord => {
    let totalRoleDays = 0;
    const nextRow: API.WorkloadRecord = { ...row };
    roles.forEach((role) => {
      const value = Number(nextRow[role.role_name] ?? 0);
      nextRow[role.role_name] = Number.isFinite(value) ? value : 0;
      totalRoleDays += Number.isFinite(value) ? value : 0;
    });
    const factor = Number(nextRow.delivery_factor ?? 1);
    nextRow.delivery_factor = Number.isFinite(factor)
      ? Number(factor.toFixed(2))
      : 1;
    const fallbackWorkload = totalRoleDays * (nextRow.delivery_factor ?? 1);
    const workloadInput = Number(nextRow.workload ?? fallbackWorkload);
    const normalizedWorkload = Number.isFinite(workloadInput)
      ? workloadInput
      : fallbackWorkload;
    nextRow.workload = Number(normalizedWorkload.toFixed(1));
    return nextRow;
  };

  const normalizeList = (list: API.WorkloadRecord[]) =>
    list.map((row) => normalizeRow(row));

  const [devWorkload, setDevWorkload] = useState<API.WorkloadRecord[]>(
    normalizeList(initialValues.dev || []),
  );
  const [integrationWorkload, setIntegrationWorkload] = useState<
    API.WorkloadRecord[]
  >(normalizeList(initialValues.integration || []));
  const [devEditableKeys, setDevEditableKeys] = useState<Key[]>([]);
  const [integrationEditableKeys, setIntegrationEditableKeys] = useState<Key[]>(
    [],
  );

  // AI评估相关状态
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [currentEvaluatedRecord, setCurrentEvaluatedRecord] = useState<API.WorkloadRecord | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [evaluationModalVisible, setEvaluationModalVisible] = useState(false);

  // 详情弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<API.WorkloadRecord | null>(
    null,
  );
  const [currentType, setCurrentType] = useState<'dev' | 'integration'>('dev');
  const [detailForm] = Form.useForm();

  // 工作量评估提示词配置（共用一套）
  const [promptSelectorVisible, setPromptSelectorVisible] = useState(false);
  const [workloadPrompt, setWorkloadPrompt] = useState<AiPrompt | null>(null);
  const [workloadPromptVariables, setWorkloadPromptVariables] = useState<Record<string, string>>({});
  const [fillFromTemplateLoading, setFillFromTemplateLoading] =
    useState(false);

  useEffect(() => {
    const normalizedDev = normalizeList(initialValues.dev || []);
    setDevWorkload(normalizedDev);
    setDevEditableKeys([]);

    const normalizedIntegration = normalizeList(
      initialValues.integration || [],
    );
    setIntegrationWorkload(normalizedIntegration);
    setIntegrationEditableKeys([]);
  }, [initialValues.dev, initialValues.integration, roles.length]);

  const handleDevChange = (list: API.WorkloadRecord[]) => {
    const mergedList = list.map((row) => {
      const prevRow = devWorkload.find((item) => item.id === row.id);
      const merged: API.WorkloadRecord = {
        ...(prevRow || {}),
        ...row,
      };
      const prevFactor = Number(prevRow?.delivery_factor ?? 1);
      const nextFactor = Number(merged.delivery_factor ?? 1);
      if (!prevRow || prevFactor !== nextFactor) {
        merged.workload = Number(calculateWorkload(merged).toFixed(1));
      }
      return merged;
    });

    const normalized = normalizeList(mergedList);
    setDevWorkload(normalized);
    onWorkloadChange(normalized, integrationWorkload);
  };

  const handleIntegrationChange = (list: API.WorkloadRecord[]) => {
    const mergedList = list.map((row) => {
      const prevRow = integrationWorkload.find((item) => item.id === row.id);
      const merged: API.WorkloadRecord = {
        ...(prevRow || {}),
        ...row,
      };
      const prevFactor = Number(prevRow?.delivery_factor ?? 1);
      const nextFactor = Number(merged.delivery_factor ?? 1);
      if (!prevRow || prevFactor !== nextFactor) {
        merged.workload = Number(calculateWorkload(merged).toFixed(1));
      }
      return merged;
    });

    const normalized = normalizeList(mergedList);
    setIntegrationWorkload(normalized);
    onWorkloadChange(devWorkload, normalized);
  };

  const duplicateRow = (
    type: 'dev' | 'integration',
    record: API.WorkloadRecord,
  ) => {
    const sourceList = type === 'dev' ? devWorkload : integrationWorkload;
    const index = sourceList.findIndex((item) => item.id === record.id);
    if (index === -1) {
      return;
    }

    const clonedRow = normalizeRow({
      ...record,
      id: createRowId(),
    });

    const nextList = [...sourceList];
    nextList.splice(index + 1, 0, clonedRow);

    if (type === 'dev') {
      handleDevChange(nextList);
    } else {
      handleIntegrationChange(nextList);
    }
  };

  const removeRow = (type: 'dev' | 'integration', id: string) => {
    if (type === 'dev') {
      handleDevChange(devWorkload.filter((row) => row.id !== id));
      setDevEditableKeys((prev) => prev.filter((key) => key !== id));
    } else {
      handleIntegrationChange(
        integrationWorkload.filter((row) => row.id !== id),
      );
      setIntegrationEditableKeys((prev) => prev.filter((key) => key !== id));
    }
  };

  // 处理AI模块生成
  const handleAIGeneration = (
    type: 'dev' | 'integration',
    modules: API.WorkloadRecord[],
  ) => {
    if (type === 'dev') {
      handleDevChange([...devWorkload, ...modules]);
    } else {
      handleIntegrationChange([...integrationWorkload, ...modules]);
    }
  };

  // 处理单模块AI评估
  const handleSingleEvaluation = async (record: API.WorkloadRecord, type: 'dev' | 'integration') => {
    try {
      // 检查是否已配置提示词模板
      if (!workloadPrompt) {
        message.warning('请先在“提示词模板”中选择模板并配置变量');
        setPromptSelectorVisible(true);
        return;
      }

      // 验证模块信息是否完整
      if (!record.module3 || !record.description) {
        message.warning('模块信息不完整，已打开详情进行完善');
        handleShowDetail(record, type);
        return;
      }

      // 设置评估状态
      setEvaluationLoading(true);
      setCurrentEvaluatedRecord(record);
      setCurrentType(type);

      // 调用后端 AI 评估接口
      const res = await aiEvaluateWorkload({
        promptId: workloadPrompt.id,
        module1: record.module1,
        module2: record.module2,
        module3: record.module3,
        description: record.description,
        variables: { ...workloadPromptVariables, desc: record.description },
        roles: roles.map(r => r.role_name),
      });

      if (!res?.success || !res.data?.parsed) {
        throw new Error(res?.error || '评估失败');
      }

      const parsed = res.data.parsed;
      const workloads = parsed.role_workloads || {};
      const flattened: Record<string, number> & { delivery_factor?: number; confidence?: number; complexity?: string } = {};
      roles.forEach(role => {
        flattened[role.role_name] = Number(workloads[role.role_name] || 0);
      });
      if (parsed.delivery_factor !== undefined) flattened.delivery_factor = parsed.delivery_factor;
      if (parsed.confidence !== undefined) flattened.confidence = parsed.confidence;
      if (parsed.complexity !== undefined) flattened.complexity = parsed.complexity as any;

      setEvaluationResult(flattened);
      setEvaluationModalVisible(true);

    } catch (error) {
      console.error('评估失败:', error);
      const msg = error instanceof Error ? error.message : '工作量评估失败，请重试';
      message.error(msg);
    } finally {
      // 重置评估状态
      setEvaluationLoading(false);
      // 注意：这里不重置 currentEvaluatedRecord，因为弹窗中还需要使用
    }
  };

  // 详情弹窗内触发AI评估
  const handleDetailEvaluate = async () => {
    try {
      if (!workloadPrompt) {
        message.warning('请先在“提示词模板”中选择模板并配置变量');
        setPromptSelectorVisible(true);
        return;
      }
      const values = await detailForm.validateFields();
      const record: API.WorkloadRecord = {
        ...(currentRecord as any),
        ...values,
      };
      setEvaluationLoading(true);
      setCurrentEvaluatedRecord(record);

      const res = await aiEvaluateWorkload({
        promptId: workloadPrompt.id,
        module1: record.module1!,
        module2: record.module2!,
        module3: record.module3!,
        description: record.description!,
        variables: { ...workloadPromptVariables, desc: record.description! },
        roles: roles.map(r => r.role_name),
      });

      if (!res?.success || !res.data?.parsed) {
        throw new Error(res?.error || '评估失败');
      }

      const parsed = res.data.parsed;
      const workloads = parsed.role_workloads || {};
      const flattened: Record<string, number> & { delivery_factor?: number; confidence?: number; complexity?: string } = {};
      roles.forEach(role => {
        flattened[role.role_name] = Number(workloads[role.role_name] || 0);
      });
      if (parsed.delivery_factor !== undefined) flattened.delivery_factor = parsed.delivery_factor;
      if (parsed.confidence !== undefined) flattened.confidence = parsed.confidence;
      if (parsed.complexity !== undefined) flattened.complexity = parsed.complexity as any;

      setEvaluationResult(flattened);
      setEvaluationModalVisible(true);
    } catch (error) {
      console.error('评估失败:', error);
      const msg = error instanceof Error ? error.message : '工作量评估失败，请重试';
      message.error(msg);
    } finally {
      setEvaluationLoading(false);
    }
  };

  // 处理应用评估结果
  const handleApplyEvaluation = (workloads: Record<string, number>, factor: number) => {
    if (!currentEvaluatedRecord || !evaluationResult) {
      message.error('评估数据不存在');
      return;
    }

    try {
      // 创建更新的记录
      const updatedRecord: API.WorkloadRecord = {
        ...currentEvaluatedRecord,
      };

      // 更新所有角色的工作量
      roles.forEach(role => {
        updatedRecord[role.role_name] = workloads[role.role_name] || 0;
      });

      // 应用交付系数
      updatedRecord.delivery_factor = factor;

      // 计算总工时
      const totalWorkDays = roles.reduce((sum, role) => {
        return sum + (workloads[role.role_name] || 0);
      }, 0);

      updatedRecord.workload = Number((totalWorkDays * factor).toFixed(1));

      // 记录AI评估使用信息
      updatedRecord.ai_evaluation_result = {
        used: true,
        modelName: 'AI-Assistant',
        modelProvider: AI_PROVIDER_LABELS.OPENAI,
        promptTemplate: 'workload-evaluation',
        evaluatedRoles: roles.filter(role => (workloads[role.role_name] || 0) > 0).map(role => role.role_name),
        timestamp: new Date().toISOString(),
        confidence: evaluationResult.confidence || 0.85,
      };

      // 更新对应列表中的记录
      if (currentType === 'dev') {
        const newList = devWorkload.map(item =>
          item.id === currentEvaluatedRecord.id ? updatedRecord : item
        );
        handleDevChange(newList);
      } else {
        const newList = integrationWorkload.map(item =>
          item.id === currentEvaluatedRecord.id ? updatedRecord : item
        );
        handleIntegrationChange(newList);
      }

      // 若详情弹窗正在查看同一条记录，则同步更新表单显示
      if (detailModalVisible && currentRecord && currentRecord.id === updatedRecord.id) {
        const formValues: Record<string, any> = {
          module1: updatedRecord.module1,
          module2: updatedRecord.module2,
          module3: updatedRecord.module3,
          description: updatedRecord.description,
          delivery_factor: updatedRecord.delivery_factor,
          calculatedWorkload: (updatedRecord.workload || 0).toFixed(1),
        };
        roles.forEach((role) => {
          formValues[role.role_name] = updatedRecord[role.role_name] || 0;
        });
        detailForm.setFieldsValue(formValues);
        setCurrentRecord(updatedRecord);
      }

      // 关闭弹窗并清空状态
      setEvaluationModalVisible(false);
      setCurrentEvaluatedRecord(null);
      setEvaluationResult(null);

      message.success('工作量评估结果已应用');

    } catch (error) {
      console.error('应用评估结果失败:', error);
      message.error('应用评估结果失败，请重试');
    }
  };

  // 取消评估
  const handleCancelEvaluation = () => {
    setEvaluationModalVisible(false);
    setCurrentEvaluatedRecord(null);
    setEvaluationResult(null);
  };

  const handleShowDetail = (
    record: API.WorkloadRecord,
    type: 'dev' | 'integration',
  ) => {
    setCurrentRecord(record);
    setCurrentType(type);
    setDetailModalVisible(true);

    // 初始化表单数据
    const formData: Record<string, any> = {
      module1: record.module1,
      module2: record.module2,
      module3: record.module3,
      description: record.description,
      delivery_factor: record.delivery_factor,
    };

    // 添加所有角色的工作天数
    roles.forEach((role) => {
      formData[role.role_name] = record[role.role_name] || 0;
    });

    // 先设置基础字段和角色工作量
    detailForm.setFieldsValue(formData);

    // 打开弹窗时重新计算预估工时，保证与当前行数据一致
    const workload = calculateWorkload(formData);
    detailForm.setFieldsValue({
      calculatedWorkload: workload.toFixed(1),
    });
  };

  // 保存详情修改
  const handleDetailSave = async () => {
    try {
      const values = await detailForm.validateFields();

      // 计算工时
      const workload = calculateWorkload(values);

      const updatedRecord: API.WorkloadRecord = {
        ...currentRecord,
        ...values,
        workload: Number(workload.toFixed(1)),
      };

      // 更新对应的数据列表
      if (currentType === 'dev') {
        const newList = devWorkload.map((item) =>
          item.id === currentRecord?.id ? normalizeRow(updatedRecord) : item,
        );
        handleDevChange(newList);
      } else {
        const newList = integrationWorkload.map((item) =>
          item.id === currentRecord?.id ? normalizeRow(updatedRecord) : item,
        );
        handleIntegrationChange(newList);
      }

      message.success('修改成功');
      setDetailModalVisible(false);
      setCurrentRecord(null);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 关闭详情弹窗
  const handleDetailCancel = () => {
    setDetailModalVisible(false);
    setCurrentRecord(null);
    detailForm.resetFields();
  };
  const handleFillFromTemplate = async () => {
    try {
      setFillFromTemplateLoading(true);

      // 1. 获取当前模板项目
      const listResult = await getAllProjects({
        params: { is_template: 1 },
      });
      const projects = Array.isArray(listResult?.data)
        ? listResult.data
        : [];
      const templateProject =
        projects.find((p) => p.is_template === 1) || projects[0];

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

      const templateDev =
        Array.isArray(parsed.development_workload)
          ? parsed.development_workload
          : [];
      const templateIntegration =
        Array.isArray(parsed.integration_workload)
          ? parsed.integration_workload
          : [];

      if (
        templateDev.length === 0 &&
        templateIntegration.length === 0
      ) {
        message.warning('模板中没有工作量数据');
        return;
      }

      const normalizedDev = normalizeList(templateDev);
      const normalizedIntegration =
        normalizeList(templateIntegration);

      setDevWorkload(normalizedDev);
      setIntegrationWorkload(normalizedIntegration);
      onWorkloadChange(normalizedDev, normalizedIntegration);

      message.success(
        `已根据模板“${detailResult.data.name}”填充工作量数据`,
      );
    } catch (error) {
      console.error('从模板填充工作量失败:', error);
      const msg =
        error instanceof Error
          ? error.message
          : '从模板填充工作量失败，请稍后重试';
      message.error(msg);
    } finally {
      setFillFromTemplateLoading(false);
    }
  };

  // 表格显示列（简化版，不显示功能说明和角色列）
  const displayColumns: ProColumns<API.WorkloadRecord>[] = [
    {
      title: '一级模块',
      dataIndex: 'module1',
      width: 160,
      formItemProps: {
        rules: [{ required: true, message: '请输入一级模块' }],
      },
    },
    {
      title: '二级模块',
      dataIndex: 'module2',
      width: 160,
      formItemProps: {
        rules: [{ required: true, message: '请输入二级模块' }],
      },
    },
    {
      title: '三级模块',
      dataIndex: 'module3',
      width: 160,
      formItemProps: {
        rules: [{ required: true, message: '请输入三级模块' }],
      },
    },
    {
      title: '交付系数',
      dataIndex: 'delivery_factor',
      valueType: 'digit',
      width: 120,
      align: 'center',
      fieldProps: {
        min: 0,
        precision: 2,
      },
      formItemProps: {
        rules: [{ required: true, message: '请输入交付系数' }],
      },
    },
    {
      title: (
        <span>
          工时 (人/天)
          <Tooltip title="该字段会在详情页或AI评估后自动计算">
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'workload',
      width: 140,
      align: 'right',
      valueType: 'digit',
      fieldProps: {
        min: 0,
        precision: 1,
        disabled: true,
      },
      editable: false, // 工时由详情页计算，禁止在表格中直接编辑
      render: (_, record) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {record.workload || 0}
        </span>
      ),
    },
  ];

  const buildOperationRender =
    (type: 'dev' | 'integration') =>
    (
      _: unknown,
      record: API.WorkloadRecord,
      __: number,
      action?: ActionType,
    ) => {
      const currentEditableKeys =
        type === 'dev' ? devEditableKeys : integrationEditableKeys;
      const isEditing = currentEditableKeys.includes(record.id);
      const isEvaluating =
        evaluationLoading && currentEvaluatedRecord?.id === record.id;
      const globalDisabled = evaluationLoading;

      const buttons = isEditing
        ? [
            <Button
              key="detail"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => handleShowDetail(record, type)}
            >
              详情
            </Button>,
            <Button
              key="save"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => action?.save?.(record.id)}
            >
              保存
            </Button>,
            <Button
              key="cancel"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => action?.cancelEditable?.(record.id)}
            >
              取消
            </Button>,
            <Button
              key="delete"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => removeRow(type, record.id)}
            >
              删除
            </Button>,
          ]
        : [
            <Button
              key="detail"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => handleShowDetail(record, type)}
            >
              详情
            </Button>,
            <Button
              key="edit"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => action?.startEditable?.(record.id)}
            >
              编辑
            </Button>,
            <Button
              key="evaluate"
              type="link"
              icon={<RobotOutlined />}
              size="small"
              loading={isEvaluating}
              disabled={globalDisabled}
              onClick={() => handleSingleEvaluation(record, type)}
              style={{ padding: 0 }}
            >
              一键评估
            </Button>,
            <Button
              key="copy"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => duplicateRow(type, record)}
            >
              复制
            </Button>,
            <Button
              key="delete"
              type="link"
              size="small"
              disabled={globalDisabled}
              onClick={() => removeRow(type, record.id)}
            >
              删除
            </Button>,
          ];

      return (
        <Space size="small" style={{ justifyContent: 'center', width: '100%' }}>
          {buttons}
        </Space>
      );
    };

  const devColumns: ProColumns<API.WorkloadRecord>[] = [
    ...displayColumns,
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      align: 'center',
      render: buildOperationRender('dev'),
    },
  ];

  const integrationColumns: ProColumns<API.WorkloadRecord>[] = [
    ...displayColumns,
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      align: 'center',
      render: buildOperationRender('integration'),
    },
  ];

  return (
    <>
      <Tabs
        defaultActiveKey="module-analyzer"
        items={[
          {
            key: 'module-analyzer',
            label: (
              <span>
                <SearchOutlined />
                AI模块梳理
              </span>
            ),
            children: (
              <ProjectModuleAnalyzer
                onModulesGenerated={handleAIGeneration}
                aiEnabled={!evaluationLoading}
                roles={roles}
              />
            ),
          },
          {
            key: 'development',
            label: '新功能开发',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Button
                      onClick={handleFillFromTemplate}
                      disabled={evaluationLoading}
                      loading={fillFromTemplateLoading}
                      style={{ display: 'none' }}
                    >
                      从模板一键填充
                    </Button>
                    <Button
                      icon={<SettingOutlined />}
                      onClick={() => setPromptSelectorVisible(true)}
                      disabled={evaluationLoading}
                    >
                      提示词模板
                    </Button>
                    {workloadPrompt ? (
                      <Tag color="blue">模板：{workloadPrompt.name}</Tag>
                    ) : (
                      <Tag>未选择模板</Tag>
                    )}
                  </Space>
                </div>
                <EditableProTable<API.WorkloadRecord>
                  rowKey="id"
                  columns={devColumns}
                  value={devWorkload}
                  onChange={handleDevChange}
                  recordCreatorProps={{
                    position: 'bottom',
                    record: () => ({
                      id: createRowId(),
                      delivery_factor: 1,
                      workload: 0,
                    }),
                    creatorButtonText: '新增功能项',
                  }}
                  editable={{
                    type: 'multiple',
                    editableKeys: devEditableKeys,
                    onChange: setDevEditableKeys,
                  }}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                />
              </>
            ),
          },
          {
            key: 'integration',
            label: '系统对接工作量',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Button
                      onClick={handleFillFromTemplate}
                      disabled={evaluationLoading}
                      loading={fillFromTemplateLoading}
                      style={{ display: 'none' }}
                    >
                      从模板一键填充
                    </Button>
                    {workloadPrompt ? (
                      <Tag color="blue">模板：{workloadPrompt.name}</Tag>
                    ) : (
                      <Tag>未选择模板</Tag>
                    )}
                  </Space>
                </div>
                <EditableProTable<API.WorkloadRecord>
                  rowKey="id"
                  columns={integrationColumns}
                  value={integrationWorkload}
                  onChange={handleIntegrationChange}
                  recordCreatorProps={{
                    position: 'bottom',
                    record: () => ({
                      id: createRowId(),
                      delivery_factor: 1,
                      workload: 0,
                    }),
                    creatorButtonText: '新增对接项',
                  }}
                  editable={{
                    type: 'multiple',
                    editableKeys: integrationEditableKeys,
                    onChange: setIntegrationEditableKeys,
                  }}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                />
              </>
            ),
          },
        ]}
      />
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={onPrev} disabled={evaluationLoading}>
            上一步
          </Button>
          <Button type="primary" onClick={onNext} disabled={evaluationLoading}>
            下一步
          </Button>
        </Space>
      </div>

      {/* 详情修改弹窗 */}
      <Modal
        title="工作量详情"
        open={detailModalVisible}
        onCancel={evaluationLoading ? undefined : handleDetailCancel}
        width={900}
        footer={[
          <Button
            key="evaluate"
            loading={evaluationLoading}
            disabled={evaluationLoading}
            icon={<RobotOutlined />}
            onClick={handleDetailEvaluate}
          >
            AI评估
          </Button>,
          <Button key="cancel" onClick={handleDetailCancel} disabled={evaluationLoading}>
            取消
          </Button>,
          <Button
            key="ok"
            type="primary"
            onClick={handleDetailSave}
            disabled={evaluationLoading}
          >
            保存
          </Button>,
        ]}
      >
        <Form form={detailForm} layout="vertical" autoComplete="off">
          {/* 基本信息 */}
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>
                基本信息
              </div>
            </Col>
            <Col span={8}>
              <Form.Item
                label="一级模块"
                name="module1"
                rules={[{ required: true, message: '请输入一级模块' }]}
              >
                <Input placeholder="请输入一级模块" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="二级模块"
                name="module2"
                rules={[{ required: true, message: '请输入二级模块' }]}
              >
                <Input placeholder="请输入二级模块" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="三级模块"
                name="module3"
                rules={[{ required: true, message: '请输入三级模块' }]}
              >
                <Input placeholder="请输入三级模块" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="功能说明"
                name="description"
                rules={[{ required: true, message: '请输入功能说明' }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="请输入功能说明"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 角色工作量 */}
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>
                角色工作量（人/天）
              </div>
            </Col>
            {roles.map((role) => (
              <Col span={6} key={role.id}>
                <Form.Item
                  label={role.role_name}
                  name={role.role_name}
                  tooltip={`单价: ${role.unit_price} 元/天`}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="0"
                    onChange={() => {
                      // 实时计算工时
                      const values = detailForm.getFieldsValue();
                      const workload = calculateWorkload(values);
                      detailForm.setFieldsValue({
                        calculatedWorkload: workload.toFixed(1),
                      });
                    }}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>

          {/* 计算参数 */}
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>
                计算参数
              </div>
            </Col>
            <Col span={12}>
              <Form.Item
                label="交付系数"
                name="delivery_factor"
                rules={[{ required: true, message: '请输入交付系数' }]}
                tooltip="用于调整实际交付工作量，建议范围 0.5-1.5"
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="1.0"
                  onChange={() => {
                    // 实时计算工时
                    const values = detailForm.getFieldsValue();
                    const workload = calculateWorkload(values);
                    detailForm.setFieldsValue({
                      calculatedWorkload: workload.toFixed(1),
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="预估工时（人/天）"
                name="calculatedWorkload"
                tooltip="根据角色工作量和交付系数自动计算"
              >
                <Input
                  disabled
                  style={{ color: '#1890ff', fontWeight: 500 }}
                  placeholder="自动计算"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 成本预估 */}
          {currentRecord && (
            <Row gutter={16}>
              <Col span={24}>
                <div
                  style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}
                >
                  成本预估
                </div>
              </Col>
              <Col span={24}>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="记录类型">
                    {currentType === 'dev' ? '新功能开发' : '系统对接工作量'}
                  </Descriptions.Item>
                  <Descriptions.Item label="当前工时（人/天）">
                    <span style={{ color: '#1890ff', fontWeight: 500 }}>
                      {currentRecord.workload || 0}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="角色成本预估" span={2}>
                    {roles.map((role) => {
                      const days = Number(currentRecord[role.role_name] || 0);
                      const cost = days * (role.unit_price / 10000);
                      if (days > 0) {
                        return (
                          <div key={role.id} style={{ marginBottom: 4 }}>
                            {role.role_name}: {days} 天 ×{' '}
                            {(role.unit_price / 10000).toFixed(2)} 万/天 =
                            <span style={{ color: '#52c41a', fontWeight: 500 }}>
                              {' '}
                              {cost.toFixed(2)} 万元
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>

      {/* AI评估结果弹窗 */}
      <WorkloadEvaluationModal
        visible={evaluationModalVisible}
        record={currentEvaluatedRecord}
        evaluationResult={evaluationResult}
        roles={roles}
        onApply={handleApplyEvaluation}
        onCancel={handleCancelEvaluation}
      />

      <WorkloadPromptSelectorModal
        visible={promptSelectorVisible}
        onCancel={() => setPromptSelectorVisible(false)}
        onSave={(prompt, vars) => {
          setWorkloadPrompt(prompt);
          setWorkloadPromptVariables(vars || {});
          setPromptSelectorVisible(false);
          message.success('已保存工作量评估提示词配置');
        }}
        initialPrompt={workloadPrompt}
        initialVariables={workloadPromptVariables}
      />
    </>
  );
};

export default WorkloadEstimation;
