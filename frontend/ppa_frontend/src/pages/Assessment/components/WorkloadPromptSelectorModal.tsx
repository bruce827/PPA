import { SettingOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Space, Spin, Typography, Alert, message } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { getWorkloadEvaluationPrompts, type AiPrompt } from '@/services/assessment';
import { getRoleList } from '@/services/config';

interface WorkloadPromptSelectorModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (prompt: AiPrompt, variables: Record<string, string>) => void;
  initialPrompt?: AiPrompt | null;
  initialVariables?: Record<string, string>;
}

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

function applyTemplate(content: string, variables: Record<string, string>) {
  if (!content) return '';
  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key] ?? '');
    }
    return '';
  });
}

const WorkloadPromptSelectorModal: React.FC<WorkloadPromptSelectorModalProps> = ({
  visible,
  onCancel,
  onSave,
  initialPrompt = null,
  initialVariables = {},
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<AiPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<AiPrompt | null>(initialPrompt || null);
  const [currentVars, setCurrentVars] = useState<Record<string, string>>(initialVariables || {});
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const loadPrompts = async () => {
      setPromptsLoading(true);
      try {
        const res = await getWorkloadEvaluationPrompts();
        if (res?.success && Array.isArray(res.data)) {
          setAvailablePrompts(res.data);
        } else {
          setAvailablePrompts([]);
        }
      } catch (e) {
        setAvailablePrompts([]);
      } finally {
        setPromptsLoading(false);
      }
    };
    loadPrompts();
  }, [visible]);

  useEffect(() => {
    if (!visible || promptsLoading) return;
    // 初始化表单
    const promptId = selectedPrompt?.id;
    const defaultVars: Record<string, string> = {};
    (selectedPrompt?.variables || []).forEach((v) => {
      defaultVars[v.name] = v.default_value || '';
    });
    const merged = { ...defaultVars, ...(initialVariables || {}) };
    setCurrentVars(merged);
    form.setFieldsValue({ promptId, variables: merged });
  }, [visible, selectedPrompt, promptsLoading]);

  const preview = useMemo(() => {
    // 增补行级占位符，便于用户理解
    const withPlaceholders = {
      module1: '<一级模块>',
      module2: '<二级模块>',
      module3: '<三级模块>',
      description: '<功能描述>',
      roles: '<角色列表>',
      ...(currentVars || {}),
    } as Record<string, string>;
    return applyTemplate(selectedPrompt?.content || '', withPlaceholders);
  }, [currentVars, selectedPrompt]);

  const handlePromptChange = (promptId?: string) => {
    const prompt = availablePrompts.find((p) => p.id === promptId) || null;
    setSelectedPrompt(prompt);
    const defaultVars: Record<string, string> = {};
    (prompt?.variables || []).forEach((v) => {
      defaultVars[v.name] = v.default_value || '';
    });
    setCurrentVars(defaultVars);
    form.setFieldsValue({ variables: defaultVars });
  };

  const handleFillRolesFromConfig = async () => {
    try {
      setRolesLoading(true);
      const res: any = await getRoleList();
      const list: any[] = Array.isArray(res?.data) ? res.data : [];
      if (!list.length) {
        message.warning('角色配置为空，请先在“参数配置 > 角色与单价管理”中添加角色');
        return;
      }
      const roleNames = list
        .map((r) => String(r.role_name || '').trim())
        .filter(Boolean);
      const rolesText = roleNames.join('，');

      const nextVars = {
        ...(currentVars || {}),
        roles: rolesText,
      };
      setCurrentVars(nextVars);

      const existingVars = form.getFieldValue('variables') || {};
      form.setFieldsValue({
        variables: {
          ...existingVars,
          roles: rolesText,
        },
      });

      message.success('已从参数配置填充角色列表');
    } catch (e) {
      message.error('获取角色配置失败，请稍后重试');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const promptId: string | undefined = values.promptId;
      const vars: Record<string, string> = values.variables || {};
      if (!promptId) return;
      const prompt = availablePrompts.find((p) => p.id === promptId);
      if (!prompt) return;
      setCurrentVars(vars);
      onSave(prompt, vars);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          工作量评估 · 提示词模板
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      width={900}
      destroyOnHidden
      confirmLoading={loading}
      okButtonProps={{ disabled: !selectedPrompt || promptsLoading }}
    >
      {promptsLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          onValuesChange={(_, allValues) => setCurrentVars(allValues?.variables || {})}
        >
          {availablePrompts.length === 0 && (
            <Alert
              type="warning"
              showIcon
              message="未找到工作量评估模板"
              description="请先在提示词管理中创建或启用 category 为 workload_evaluation 的提示词模板。"
              style={{ marginBottom: 12 }}
            />
          )}
          <Form.Item
            label="选择提示词模板"
            name="promptId"
            rules={[{ required: true, message: '请选择提示词模板' }]}
          >
            <Select
              placeholder="请选择模板"
              onChange={handlePromptChange}
              options={availablePrompts.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>模板变量</span>
                <Button
                  size="small"
                  onClick={handleFillRolesFromConfig}
                  loading={rolesLoading}
                  disabled={!selectedPrompt || promptsLoading}
                >
                  从参数配置填充角色列表
                </Button>
              </Space>
            }
            tooltip="会与评估时的模块信息合并传入"
          >
            {selectedPrompt && selectedPrompt.variables && selectedPrompt.variables.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {selectedPrompt.variables.map((v) => (
                  <Form.Item key={v.name} name={[ 'variables', v.name ]} label={v.display_name || v.name}>
                    <Input placeholder={v.description || v.name} />
                  </Form.Item>
                ))}
              </div>
            ) : (
              <Alert type="info" message="当前模板无自定义变量，将仅使用行级模块信息进行评估" showIcon />
            )}
          </Form.Item>

          <Form.Item label={
            <Space>
              <EyeOutlined />
              最终提示词预览（含占位符）
            </Space>
          }>
            <TextArea value={preview} rows={8} readOnly style={{ fontFamily: 'Menlo,Monaco,Consolas,monospace' }} />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              预览中会将 module1/module2/module3/description/roles 用占位符替换。实际评估时会注入当前行的真实数据。
            </Paragraph>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default WorkloadPromptSelectorModal;
