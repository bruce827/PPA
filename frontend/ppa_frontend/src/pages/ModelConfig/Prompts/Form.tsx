import { getRiskItemList, getRoleList } from '@/services/config';
import { translateRoleToSlug } from './utils/roleNaming';
import { categoryToSlug, extractItemEnSlug, stripParen, toSafeVar } from './utils/riskNaming';
import type { PromptTemplate, PromptVariable } from '@/services/promptTemplate';
import {
  createPromptTemplate,
  getPromptTemplateById,
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

const PromptTemplateForm: React.FC = () => {
  const [form] = Form.useForm();
  const { id } = useParams<{ id: string }>();
  const categoryValue = Form.useWatch('category', form);
  const isEdit = !!id;
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [variableEditorVisible, setVariableEditorVisible] = useState(false);
  const [editingVariable, setEditingVariable] = useState<PromptVariable | null>(
    null,
  );
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [detectedUndefinedVars, setDetectedUndefinedVars] = useState<string[]>(
    [],
  );
  const userPromptRef = useRef<any>(null);
  // 记录各分类自动灌入的变量名，用于分类切换时清理
  const [autoInjectedByCategory, setAutoInjectedByCategory] = useState<
    Record<string, string[]>
  >({});
  const prevCategoryRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isEdit) {
      getPromptTemplateById(Number(id)).then((res) => {
        setTemplate(res);
        form.setFieldsValue(res);

        // 解析变量
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

  // 智能检测未定义的变量
  const detectUndefinedVariables = (template: string) => {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const matches = template.matchAll(regex);
    const detected = new Set<string>();

    for (const match of matches) {
      const varName = match[1];
      if (!variables.find((v) => v.name === varName)) {
        detected.add(varName);
      }
    }

    setDetectedUndefinedVars(Array.from(detected));
  };

  // 用户提示词模板变化时检测变量
  const handleUserPromptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    form.setFieldValue('user_prompt_template', value);
    detectUndefinedVariables(value);
  };

  // 添加/编辑变量
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
      // 编辑
      newVariables[editingIndex] = values;
    } else {
      // 新增 - 检查重复
      if (newVariables.find((v) => v.name === values.name)) {
        message.error('变量名已存在');
        return;
      }
      newVariables.push(values);
    }

    setVariables(newVariables);
    setVariableEditorVisible(false);
    message.success(editingIndex >= 0 ? '变量已更新' : '变量已添加');

    // 重新检测
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

  // 快速添加检测到的未定义变量
  const handleQuickAddUndefined = () => {
    if (detectedUndefinedVars.length === 0) return;

    const varName = detectedUndefinedVars[0];
    setEditingVariable({
      name: varName,
      description: '',
      example: '',
      required: false,
    });
    setEditingIndex(-1);
    setVariableEditorVisible(true);
  };

  // 插入变量到用户提示词
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

    // 设置光标位置
    setTimeout(() => {
      const newPosition = start + variableName.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  // 从风险评估项自动灌入变量（评估类别 + 评估项）
  const syncRiskVariables = async () => {
    try {
      const res: any = await getRiskItemList();
      const list: any[] = Array.isArray(res?.data) ? res.data : [];
      if (!list.length) {
        message.warning(
          '风险评估项为空，请先到“参数配置 > 风险评估项管理”配置评估项',
        );
        return;
      }

      // 现有变量名集合（以现有为主，存在则跳过自动灌入）
      const existingNames = new Set((variables || []).map((v) => v.name));
      const baseCount = new Map<string, number>();
      const injected: PromptVariable[] = [];
      const injectedNames: string[] = [];

      list.forEach((it: any, idx: number) => {
        const catSlug = categoryToSlug(it.category, idx + 1);
        const enItem = extractItemEnSlug(it.item_name) || '';
        const itemSlug =
          toSafeVar(enItem) ||
          toSafeVar(stripParen(it.item_name)) ||
          `item_${idx + 1}`;
        let base = toSafeVar(`${catSlug}_${itemSlug}`) || `var_${idx + 1}`;

        // 自动变量内部去重：相同 base 追加 _2, _3...
        const count = baseCount.get(base) || 0;
        baseCount.set(base, count + 1);
        const name = count === 0 ? base : toSafeVar(`${base}_${count + 1}`);

        // 若与现有（用户手工）变量重名，则跳过（以用户变量为主）
        if (existingNames.has(name)) {
          return;
        }

        injected.push({
          name,
          description: `${it.category}-${stripParen(it.item_name)}`,
          example: '',
          required: false,
        });
        injectedNames.push(name);
        existingNames.add(name);
      });

      if (!injected.length) {
        message.info('未发现可新增的风险变量（可能已存在当前变量中）');
        setAutoInjectedByCategory((prev) => ({ ...prev, risk_analysis: [] }));
        return;
      }

      setVariables((prev) => [...prev, ...injected]);
      setAutoInjectedByCategory((prev) => ({
        ...prev,
        risk_analysis: Array.from(
          new Set([...(prev?.risk_analysis || []), ...injectedNames]),
        ),
      }));
      message.success(`已导入 ${injected.length} 个变量`);
    } catch (e) {
      message.error('获取风险评估项失败');
    }
  };

  // 从角色配置自动灌入变量（成本估算）
  const syncCostVariables = async () => {
    try {
      const res: any = await getRoleList();
      const roles: any[] = Array.isArray(res?.data) ? res.data : [];
      if (!roles.length) {
        message.warning(
          '角色配置为空，请先到“参数配置 > 角色与单价管理”配置角色',
        );
        return;
      }

      const existingNames = new Set((variables || []).map((v) => v.name));
      const baseCount = new Map<string, number>();
      const injected: PromptVariable[] = [];
      const injectedNames: string[] = [];

      roles.forEach((role, idx) => {
        const rawName: string = String(role.role_name || '').trim();
        // 基于翻译/拼音转写生成英文slug，尽量避免占位名
        let base = translateRoleToSlug(rawName);
        if (!base) base = `member_${idx + 1}`;

        // 自动变量内部去重
        const count = baseCount.get(base) || 0;
        baseCount.set(base, count + 1);
        const name = count === 0 ? base : toSafeVar(`${base}_${count + 1}`);

        if (existingNames.has(name)) {
          return;
        }

        injected.push({
          name,
          description: rawName || `角色${idx + 1}`,
          help: `对应角色：${rawName}${role.unit_price ? `，单价：${role.unit_price} 元/天` : ''}`,
          example: '1.0',
          required: false,
        });
        injectedNames.push(name);
        existingNames.add(name);
      });

      if (!injected.length) {
        message.info('未发现可新增的角色变量（可能已存在当前变量中）');
        setAutoInjectedByCategory((prev) => ({ ...prev, cost_estimation: [] }));
        return;
      }

      setVariables((prev) => [...prev, ...injected]);
      setAutoInjectedByCategory((prev) => ({
        ...prev,
        cost_estimation: Array.from(
          new Set([...(prev?.cost_estimation || []), ...injectedNames]),
        ),
      }));
      message.success(`已导入 ${injected.length} 个角色变量`);
    } catch (e) {
      message.error('获取角色配置失败');
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

  return (
    <PageContainer>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={async (changedValues, allValues) => {
            if ('category' in changedValues) {
              const newCat = changedValues.category;
              const prevCat = prevCategoryRef.current;
              prevCategoryRef.current = newCat;

              // 从某分类切换出去：移除该分类自动灌入变量
              if (prevCat && prevCat !== newCat) {
                const names = autoInjectedByCategory[prevCat] || [];
                if (names.length > 0) {
                  setVariables((prev) => prev.filter((v) => !names.includes(v.name)));
                  setAutoInjectedByCategory((prev) => ({ ...prev, [prevCat]: [] }));
                }
              }

              // 切换到 风险分析：自动同步变量
              if (newCat === 'risk_analysis') {
                await syncRiskVariables();
              }

              // 切换到 成本估算：自动同步角色变量
              if (newCat === 'cost_estimation') {
                await syncCostVariables();
              }
            }
          }}
          initialValues={{
            category: 'custom',
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
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类" disabled={isSystemTemplate}>
              <Select.Option value="risk_analysis">风险分析</Select.Option>
              <Select.Option value="cost_estimation">成本估算</Select.Option>
              <Select.Option value="module_analysis">模块梳理</Select.Option>
              <Select.Option value="project_tagging">标签生成</Select.Option>
              <Select.Option value="report_generation">报告生成</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 500, message: '最多500个字符' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入描述"
              disabled={isSystemTemplate}
            />
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
            help="定义 AI 的角色、专业领域和任务目标"
          >
            <TextArea
              rows={6}
              placeholder="请输入系统提示词"
              disabled={isSystemTemplate}
              showCount
            />
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

            {/* 未定义变量警告 */}
            {detectedUndefinedVars.length > 0 && (
              <Alert
                message={
                  <Space wrap size="small">
                    <span>
                      检测到 {detectedUndefinedVars.length} 个未定义变量:
                    </span>
                    {detectedUndefinedVars.map((v) => (
                      <Tag key={v} color="warning">
                        {v}
                      </Tag>
                    ))}
                    <Button
                      type="link"
                      size="small"
                      onClick={handleQuickAddUndefined}
                      disabled={isSystemTemplate}
                    >
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

          {/* 变量管理区域 */}
          <Form.Item
            label={
              <Space>
                <span>变量定义</span>
                {categoryValue === 'risk_analysis' && !isSystemTemplate && (
                  <Button size="small" onClick={syncRiskVariables}>
                    从评估类别导入
                  </Button>
                )}
                {categoryValue === 'cost_estimation' && !isSystemTemplate && (
                  <Button size="small" onClick={syncCostVariables}>
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
              <Button onClick={() => history.push('/model-config/prompts')}>
                取消
              </Button>
              <Button
                type="default"
                icon={<EyeOutlined />}
                onClick={() => setPreviewVisible(true)}
                disabled={variables.length === 0}
              >
                预览
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                disabled={isSystemTemplate}
              >
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 变量编辑对话框 */}
      <VariableEditor
        visible={variableEditorVisible}
        variable={editingVariable}
        onOk={handleVariableSave}
        onCancel={() => setVariableEditorVisible(false)}
      />

      {/* 预览对话框 */}
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
