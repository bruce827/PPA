import type { PromptVariable } from '@/services/promptTemplate';
import { Form, Input, Modal, Switch } from 'antd';
import React, { useEffect } from 'react';

interface VariableEditorProps {
  visible: boolean;
  variable?: PromptVariable | null;
  onOk: (values: PromptVariable) => void;
  onCancel: () => void;
}

const VariableEditor: React.FC<VariableEditorProps> = ({
  visible,
  variable,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (variable) {
        form.setFieldsValue(variable);
      } else {
        form.resetFields();
      }
    }
  }, [visible, variable, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onOk(values);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={variable ? '编辑变量' : '添加变量'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
  destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          required: false,
        }}
      >
        <Form.Item
          name="name"
          label="变量名"
          rules={[
            { required: true, message: '请输入变量名' },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: '只能包含字母、数字和下划线',
            },
            { max: 50, message: '最多50个字符' },
          ]}
          help="只能包含字母、数字、下划线"
        >
          <Input placeholder="例如: project_name" disabled={!!variable} />
        </Form.Item>

        <Form.Item
          name="description"
          label="显示名称"
          rules={[
            { required: true, message: '请输入显示名称' },
            { max: 50, message: '最多50个字符' },
          ]}
        >
          <Input placeholder="例如: 项目名称" />
        </Form.Item>

        <Form.Item name="help" label="描述" help="可选，说明变量用途">
          <Input.TextArea
            rows={2}
            placeholder="例如: 用于标识评估的项目名称"
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="example"
          label="示例值"
          rules={[{ required: true, message: '请输入示例值' }]}
          help="帮助用户理解变量含义"
        >
          <Input placeholder="例如: 电商平台升级项目" />
        </Form.Item>

        <Form.Item name="required" label="必填" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VariableEditor;
