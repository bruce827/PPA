import { getRiskItemList, getRoleList } from '@/services/config';
import { translateRoleToSlug } from './utils/roleNaming';
import { categoryToSlug, extractItemEnSlug, stripParen, toSafeVar } from './utils/riskNaming';
import type { PromptTemplate, PromptVariable, PromptModuleTagOption } from '@/services/promptTemplate';
import {
  createPromptTemplate,
  createPromptModuleTag,
  getPromptTemplateById,
  getPromptModuleTags,
  updatePromptTemplate,
} from '@/services/promptTemplate';
import { EyeOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-layout';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import PreviewModal from './components/PreviewModal';
import VariableEditor from './components/VariableEditor';
import VariableInsertButton from './components/VariableInsertButton';
import VariableList from './components/VariableList';

const { TextArea } = Input;

// autoSync 函数签名：接受当前变量列表和对应的 setter
type SyncHandler = (
  variables: PromptVariable[],
  setVariables: React.Dispatch<React.SetStateAction<PromptVariable[]>>,
  setAutoInjectedByTag: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
) => Promise<void>;

const syncRiskVariables: SyncHandler = async (variables, setVariables, setAutoInjectedByTag) => {
  try {
    const res: any = await getRiskItemList();
    const list: any[] = Array.isArray(res?.data) ? res.data : [];
    if (!list.length) {
      message.warning('风险评估项为空，请先到"参数配置 > 风险评估项管理"配置评估项');
      return;
    }

    const existingNames = new Set((variables || []).map((v) => v.name));
    const baseCount = new Map<string, number>();
    const injected: PromptVariable[] = [];
    const injectedNames: string[] = [];

    list.forEach((it: any, idx: number) => {
      const catSlug = categoryToSlug(it.category, idx + 1);
      const enItem = extractItemEnSlug(it.item_name) || '';
      const itemSlug =
        toSafeVar(enItem) || toSafeVar(stripParen(it.item_name)) || `item_${idx + 1}`;
      let base = toSafeVar(`${catSlug}_${itemSlug}`) || `var_${idx + 1}`;

      const count = baseCount.get(base) || 0;
      baseCount.set(base, count + 1);
      const name = count === 0 ? base : toSafeVar(`${base}_${count + 1}`);

      if (existingNames.has(name)) return;

      injected.push({ name, description: `${it.category}-${stripParen(it.item_name)}`, example: '', required: false });
      injectedNames.push(name);
      existingNames.add(name);
    });

    if (!injected.length) {
      message.info('未发现可新增的风险变量');
      setAutoInjectedByTag((prev) => ({ ...prev, assessment: [] }));
      return;
    }

    setVariables((prev) => [...prev, ...injected]);
    setAutoInjectedByTag((prev) => ({
      ...prev,
      assessment: Array.from(new Set([...(prev?.assessment || []), ...injectedNames])),
    }));
    message.success(`已导入 ${injected.length} 个变量`);
  } catch (e) {
    message.error('获取风险评估项失败');
  }
};

const syncCostVariables: SyncHandler = async (variables, setVariables) => {
  try {
    const res: any = await getRoleList();
    const roles: any[] = Array.isArray(res?.data) ? res.data : [];
    if (!roles.length) {
      message.warning('角色配置为空，请先到"参数配置 > 角色与单价管理"配置角色');
      return;
    }

    const existingNames = new Set((variables || []).map((v) => v.name));
    const baseCount = new Map<string, number>();
    const injected: PromptVariable[] = [];

    roles.forEach((role, idx) => {
      const rawName: string = String(role.role_name || '').trim();
      let base = translateRoleToSlug(rawName);
      if (!base) base = `member_${idx + 1}`;

      const count = baseCount.get(base) || 0;
      baseCount.set(base, count + 1);
      const name = count === 0 ? base : toSafeVar(`${base}_${count + 1}`);

      if (existingNames.has(name)) return;

      injected.push({
        name,
        description: rawName || `角色${idx + 1}`,
        help: `对应角色：${rawName}${role.unit_price ? `，单价：${role.unit_price} 元/天` : ''}`,
        example: '1.0',
        required: false,
      });
      existingNames.add(name);
    });

    if (!injected.length) {
      message.info('未发现可新增的角色变量');
      return;
    }

    setVariables((prev) => [...prev, ...injected]);
    message.success(`已导入 ${injected.length} 个角色变量`);
  } catch (e) {
    message.error('获取角色配置失败');
  }
};

// autoSync 配置：module_tag → 对应的同步函数
const AUTO_SYNC_CONFIG: Record<string, SyncHandler> = {
  assessment: syncRiskVariables,
};

const PromptTemplateForm: React.FC = () => {
  const [form] = Form.useForm();
  const { id } = useParams<{ id: string }>();
  const moduleTagValue = Form.useWatch('module_tag', form);
  const isEdit = !!id;
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [variableEditorVisible, setVariableEditorVisible] = useState(false);
  const [editingVariable, setEditingVariable] = useState<PromptVariable | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [detectedUndefinedVars, setDetectedUndefinedVars] = useState<string[]>([]);
  const [moduleTagOptions, setModuleTagOptions] = useState<PromptModuleTagOption[]>([]);
  const [addTagModalVisible, setAddTagModalVisible] = useState(false);
  const [addTagForm] = Form.useForm();
  const userPromptRef = useRef<any>(null);

  // 记录各 module_tag 自动灌入的变量名，用于切换时清理
  const [autoInjectedByTag, setAutoInjectedByTag] = useState<Record<string, string[]>>({});
  const prevModuleTagRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    getPromptModuleTags().then((res) => {
      if (res?.data) {
        setModuleTagOptions(res.data);
      }
    });

    if (isEdit) {
      getPromptTemplateById(Number(id)).then((res) => {
        setTemplate(res);
        form.setFieldsValue(res);
        if (res.variables_json) {
          try {
            const parsed = JSON.parse(res.variables_json);
            setVariables(Array.isArray(parsed) ? parsed : []);
          } catch (error) {
            console.error('Failed to parse variables:', error);
          }
        }
      });
    }
  }, [id, isEdit, form]);

  const detectUndefinedVariables = (templateContent: string) => {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const matches = templateContent.matchAll(regex);
    const detected = new Set<string>();

    for (const match of matches) {
      const varName = match[1];
      if (!variables.find((v) => v.name === varName)) {
        detected.add(varName);
      }
    }

    setDetectedUndefinedVars(Array.from(detected));
  };

  const handleUserPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    form.setFieldValue('user_prompt_template', value);
    detectUndefinedVariables(value);
  };

  const handleAddVariable = () => {
    setEditingVariable(null);
    setEditingIndex(-1);
    setVariableEditorVisible(true);
  };

  const handleEditVariable = (variable: PromptVariable, index: number) => {
    setEditingVariable(variable);
    setEditingIndex(index);
    setVariableEditorVisible(true);
  };

  const handleVariableSave = (values: PromptVariable) => {
    let newVariables = [...variables];

    if (editingIndex >= 0) {
      newVariables[editingIndex] = values;
    } else {
      if (newVariables.find((v) => v.name === values.name)) {
        message.error('变量名已存在');
        return;
      }
      newVariables.push(values);
    }

    setVariables(newVariables);
    setVariableEditorVisible(false);
    message.success(editingIndex >= 0 ? '变量已更新' : '变量已添加');

    const userPrompt = form.getFieldValue('user_prompt_template');
    if (userPrompt) {
      detectUndefinedVariables(userPrompt);
    }
  };

  const handleVariableDelete = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
    message.success('变量已删除');
  };

  const handleQuickAddUndefined = () => {
    if (detectedUndefinedVars.length === 0) return;

    const varName = detectedUndefinedVars[0];
    setEditingVariable({ name: varName, description: '', example: '', required: false });
    setEditingIndex(-1);
    setVariableEditorVisible(true);
  };

  const handleInsertVariable = (variableName: string) => {
    const textarea = userPromptRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = form.getFieldValue('user_prompt_template') || '';

    const newValue =
      currentValue.substring(0, start) +
      `{{${variableName}}}` +
      currentValue.substring(end);

    form.setFieldValue('user_prompt_template', newValue);
    detectUndefinedVariables(newValue);

    setTimeout(() => {
      const newPosition = start + variableName.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  const openAddTagModal = () => {
    addTagForm.resetFields();
    setAddTagModalVisible(true);
  };

  const handleAddTag = async () => {
    try {
      const values = await addTagForm.validateFields();
      const res = await createPromptModuleTag({
        value: values.tag_value.trim(),
        label: values.tag_label.trim(),
        description: values.tag_description || '',
      });
      if (!res?.success) {
        throw new Error(res?.error || '新增标签失败');
      }
      const newTag = res.data;
      // 刷新下拉列表
      const refreshed = await getPromptModuleTags();
      if (refreshed?.data) {
        setModuleTagOptions(refreshed.data);
      }
      form.setFieldValue('module_tag', newTag.value);
      setAddTagModalVisible(false);
      message.success(`标签「${newTag.label}」已添加并选中`);
    } catch (error: any) {
      message.error(error?.message || '新增标签失败');
    }
  };

  const onFinish = async (values: any) => {
    try {
      const data = {
        ...values,
        variables_json: JSON.stringify(variables),
      };

      if (isEdit) {
        await updatePromptTemplate(Number(id), data);
        message.success('更新成功');
      } else {
        await createPromptTemplate(data);
        message.success('创建成功');
      }
      history.push('/model-config/prompts', { refresh: true });
    } catch (error) {
      message.error('操作失败');
    }
  };

  const isSystemTemplate = template?.is_system || false;

  const showRiskImport = moduleTagValue === 'assessment';
  const showCostImport = moduleTagValue === 'assessment';

  return (
    <PageContainer>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={async (changedValues) => {
            if ('module_tag' in changedValues) {
              const newTag = changedValues.module_tag;
              const prevTag = prevModuleTagRef.current;
              prevModuleTagRef.current = newTag;

              if (prevTag && prevTag !== newTag) {
                const names = autoInjectedByTag[prevTag] || [];
                if (names.length > 0) {
                  setVariables((prev) => prev.filter((v) => !names.includes(v.name)));
                  setAutoInjectedByTag((prev) => ({ ...prev, [prevTag]: [] }));
                }
              }

              const handler = AUTO_SYNC_CONFIG[newTag];
              if (handler) {
                await handler(variables, setVariables, setAutoInjectedByTag);
              }
            }
          }}
          initialValues={{
            module_tag: 'general',
            is_active: true,
          }}
        >
          <Form.Item
            name="template_name"
            label="模板名称"
            rules={[
              { required: true, message: '请输入模板名称' },
              { max: 100, message: '最多100个字符' },
            ]}
          >
            <Input placeholder="请输入模板名称" disabled={isSystemTemplate} />
          </Form.Item>

          <Form.Item
            name="module_tag"
            label={
              <Space>
                <span>模块标签</span>
                <Button type="link" size="small" onClick={openAddTagModal} disabled={isSystemTemplate}>
                  + 新增
                </Button>
              </Space>
            }
            rules={[{ required: true, message: '请选择模块标签' }]}
          >
            <Select
              showSearch
              allowClear
              placeholder="请选择模块标签"
              disabled={isSystemTemplate}
              options={moduleTagOptions.map((t) => ({
                value: t.value,
                label: `${t.label} (${t.value})`,
              }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
              }
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 500, message: '最多500个字符' }]}
          >
            <TextArea rows={3} placeholder="请输入描述" disabled={isSystemTemplate} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="是否激活"
            valuePropName="checked"
            help="禁用后，该模板将无法在评估中使用。"
          >
            <Switch disabled={isSystemTemplate} />
          </Form.Item>

          <Form.Item
            name="system_prompt"
            label="系统提示词"
            rules={[{ required: true, message: '请输入系统提示词' }]}
            help="定义 AI 的角色，专业领域和任务目标"
          >
            <TextArea rows={6} placeholder="请输入系统提示词" disabled={isSystemTemplate} showCount />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>用户提示词模板</span>
                <VariableInsertButton
                  variables={variables}
                  onInsert={handleInsertVariable}
                  disabled={isSystemTemplate}
                />
              </Space>
            }
          >
            <Form.Item
              name="user_prompt_template"
              rules={[{ required: true, message: '请输入用户提示词模板' }]}
              noStyle
            >
              <TextArea
                ref={userPromptRef}
                rows={8}
                placeholder="使用 {{变量名}} 格式插入变量"
                disabled={isSystemTemplate}
                onChange={handleUserPromptChange}
                showCount
              />
            </Form.Item>

            {detectedUndefinedVars.length > 0 && (
              <Alert
                message={
                  <Space wrap size="small">
                    <span>检测到 {detectedUndefinedVars.length} 个未定义变量:</span>
                    {detectedUndefinedVars.map((v) => (
                      <Tag key={v} color="warning">{v}</Tag>
                    ))}
                    <Button type="link" size="small" onClick={handleQuickAddUndefined} disabled={isSystemTemplate}>
                      快速添加
                    </Button>
                  </Space>
                }
                type="warning"
                style={{ marginTop: 8 }}
                closable
              />
            )}
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>变量定义</span>
                {showRiskImport && !isSystemTemplate && (
                  <Button size="small" onClick={() => syncRiskVariables(variables, setVariables, setAutoInjectedByTag)}>
                    从评估类别导入
                  </Button>
                )}
                {showCostImport && !isSystemTemplate && (
                  <Button size="small" onClick={() => syncCostVariables(variables, setVariables, setAutoInjectedByTag)}>
                    从角色配置导入
                  </Button>
                )}
              </Space>
            }
          >
            <VariableList
              variables={variables}
              onAdd={handleAddVariable}
              onEdit={handleEditVariable}
              onDelete={handleVariableDelete}
              disabled={isSystemTemplate}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => history.push('/model-config/prompts')}>取消</Button>
              <Button type="default" icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)} disabled={variables.length === 0}>
                预览
              </Button>
              <Button type="primary" htmlType="submit" disabled={isSystemTemplate}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title="新增模块标签"
        open={addTagModalVisible}
        onOk={handleAddTag}
        onCancel={() => setAddTagModalVisible(false)}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={addTagForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="tag_value"
            label="标签值"
            rules={[
              { required: true, message: '请输入标签值' },
              { pattern: /^[a-z_0-9]+$/, message: '仅支持英文小写字母、数字和下划线，如 risk_simple' },
            ]}
            extra="存储到数据库的值，如 risk_simple"
          >
            <Input placeholder="如 risk_simple" />
          </Form.Item>
          <Form.Item
            name="tag_label"
            label="展示名称"
            rules={[{ required: true, message: '请输入展示名称' }]}
            extra="前端列表和下拉中显示的名称"
          >
            <Input placeholder="如 简易风险分析" />
          </Form.Item>
          <Form.Item
            name="tag_description"
            label="描述（可选）"
          >
            <Input placeholder="如 用于风险评估向导的简易模板" />
          </Form.Item>
        </Form>
      </Modal>

      <VariableEditor
        visible={variableEditorVisible}
        variable={editingVariable}
        onOk={handleVariableSave}
        onCancel={() => setVariableEditorVisible(false)}
      />

      {isEdit && (
        <PreviewModal
          visible={previewVisible}
          templateId={Number(id)}
          variables={variables}
          onCancel={() => setPreviewVisible(false)}
        />
      )}
    </PageContainer>
  );
};

export default PromptTemplateForm;
