import type { PromptVariable } from '@/services/promptTemplate';
import { previewPromptTemplate } from '@/services/promptTemplate';
import { CopyOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useState } from 'react';

const { TextArea } = Input;
const { Text } = Typography;

interface PreviewModalProps {
  visible: boolean;
  templateId: number;
  variables: PromptVariable[];
  onCancel: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  visible,
  templateId,
  variables,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    system_prompt: string;
    user_prompt: string;
    missing_required: string[];
    unused_variables: string[];
  } | null>(null);

  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const result = await previewPromptTemplate(templateId, {
        variable_values: values,
      });

      setPreviewResult(result);
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请填写所有必填变量');
      } else {
        message.error('预览失败: ' + (error.message || '未知错误'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        message.success(`${label}已复制到剪贴板`);
      })
      .catch(() => {
        message.error('复制失败');
      });
  };

  const handleClose = () => {
    form.resetFields();
    setPreviewResult(null);
    onCancel();
  };

  return (
    <Modal
      title="预览提示词"
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={[
        <Button key="close" onClick={handleClose}>
          关闭
        </Button>,
      ]}
  destroyOnHidden
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 测试数据填写区域 */}
        <Card title="填写测试数据" size="small" style={{ marginBottom: 16 }}>
          <Form form={form} layout="vertical">
            {variables.map((variable) => (
              <Form.Item
                key={variable.name}
                name={variable.name}
                label={
                  <span>
                    {variable.description}
                    {variable.required && (
                      <span style={{ color: 'red' }}> *</span>
                    )}
                  </span>
                }
                rules={[
                  {
                    required: variable.required,
                    message: `请输入${variable.description}`,
                  },
                ]}
                help={variable.help || `示例: ${variable.example}`}
              >
                <TextArea
                  placeholder={variable.example}
                  rows={2}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>
            ))}
          </Form>
          <Button
            type="primary"
            onClick={handlePreview}
            loading={loading}
            block
          >
            生成预览
          </Button>
        </Card>

        {/* 预览结果显示区域 */}
        {previewResult && (
          <>
            {/* 警告信息 */}
            {(previewResult.missing_required.length > 0 ||
              previewResult.unused_variables.length > 0) && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {previewResult.missing_required.length > 0 && (
                    <div>
                      <Text type="warning">缺少必填变量:</Text>
                      {previewResult.missing_required.map((v) => (
                        <Tag key={v} color="warning" style={{ marginLeft: 8 }}>
                          {v}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {previewResult.unused_variables.length > 0 && (
                    <div>
                      <Text type="secondary">未使用的变量:</Text>
                      {previewResult.unused_variables.map((v) => (
                        <Tag key={v} color="default" style={{ marginLeft: 8 }}>
                          {v}
                        </Tag>
                      ))}
                    </div>
                  )}
                </Space>
              </Card>
            )}

            {/* System Prompt */}
            <Card
              title="System Prompt"
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}
              extra={
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() =>
                    handleCopy(previewResult.system_prompt, 'System Prompt')
                  }
                >
                  复制
                </Button>
              }
            >
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {previewResult.system_prompt}
              </pre>
            </Card>

            {/* User Prompt */}
            <Card
              title="User Prompt"
              size="small"
              extra={
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() =>
                    handleCopy(previewResult.user_prompt, 'User Prompt')
                  }
                >
                  复制
                </Button>
              }
            >
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {previewResult.user_prompt}
              </pre>
            </Card>
          </>
        )}
      </div>
    </Modal>
  );
};

export default PreviewModal;
