import {
  AI_MODEL_MAX_TOKENS_CONFIG,
  AI_MODEL_TEMPERATURE_CONFIG,
  AI_MODEL_TIMEOUT_CONFIG,
  AI_PROVIDER_OPTIONS,
} from '@/constants';
import { createAIModel, updateAIModel } from '@/services/aiModel';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSlider,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { Alert, Button, Card, Form, message, Space } from 'antd';
import { useEffect, useState } from 'react';

interface ModelFormProps {
  visible: boolean;
  record?: API.AIModelConfig;
  currentModelId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const ModelForm: React.FC<ModelFormProps> = ({
  visible,
  record,
  currentModelId,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    duration?: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      if (record) {
        form.setFieldsValue(record);
      } else {
        form.resetFields();
      }
      setTestResult(null); // 清空测试结果
    }
  }, [visible, record, form]);

  const handleSubmit = async (values: any) => {
    try {
      let response;
      if (record) {
        response = await updateAIModel(record.id, values);
      } else {
        response = await createAIModel(values);
      }

      if (response.success) {
        message.success(response.message || `${record ? '更新' : '创建'}成功`);
        onSuccess();
        return true;
      } else {
        message.error(response.message || `${record ? '更新' : '创建'}失败`);
        return false;
      }
    } catch (error: any) {
      message.error(error.message || `${record ? '更新' : '创建'}失败`);
      return false;
    }
  };

  // 测试连接（使用当前表单数据，不保存）
  const handleTestConnection = async () => {
    try {
      // 验证必填字段
      await form.validateFields([
        'provider',
        'api_key',
        'api_host',
        'model_name',
      ]);

      const formValues = form.getFieldsValue();

      setTestLoading(true);
      setTestResult(null);

      // 调用临时测试 API（POST 请求，传递表单数据）
      const response = await request('/api/config/ai-models/test-temp', {
        method: 'POST',
        data: {
          provider: formValues.provider,
          api_key: formValues.api_key,
          api_host: formValues.api_host,
          model_name: formValues.model_name,
          timeout: formValues.timeout || 30,
        },
      });

      setTestLoading(false);

      if (response.success) {
        setTestResult({
          success: true,
          message: response.message || '连接成功',
          duration: response.data?.duration,
        });
        message.success('连接测试成功');
      } else {
        setTestResult({
          success: false,
          message: response.message || '连接失败',
        });
        message.error('连接测试失败');
      }
    } catch (error: any) {
      setTestLoading(false);
      if (error.errorFields) {
        // 表单验证错误
        message.warning('请先填写必填字段');
      } else {
        setTestResult({
          success: false,
          message: error.message || '测试失败',
        });
        message.error('连接测试失败');
      }
    }
  };

  const hasOtherCurrent =
    currentModelId !== undefined &&
    (record?.id === undefined || currentModelId !== record.id);

  return (
    <ModalForm
      title={record ? '编辑模型配置' : '新建模型配置'}
      open={visible}
      form={form}
      autoFocusFirstInput
      modalProps={{
        onCancel: onCancel,
  destroyOnHidden: true,
      }}
      submitTimeout={2000}
      onFinish={handleSubmit}
      width={600}
    >
      <ProFormText
        name="config_name"
        label="配置名称"
        placeholder="请输入配置名称"
        rules={[{ required: true, message: '请输入配置名称' }]}
      />

      <ProFormTextArea
        name="description"
        label="配置描述"
        placeholder="请输入配置描述（可选）"
        fieldProps={{
          rows: 3,
        }}
      />

      <ProFormSelect
        name="provider"
        label="服务商"
        placeholder="请选择服务商"
        rules={[{ required: true, message: '请选择服务商' }]}
        options={AI_PROVIDER_OPTIONS}
      />

      <ProFormText
        name="api_key"
        label="API Key"
        placeholder="请输入 API Key"
        rules={[{ required: true, message: '请输入 API Key' }]}
        fieldProps={{
          type: 'text',
        }}
      />

      <ProFormText
        name="api_host"
        label="API Host"
        placeholder="例如：https://api.openai.com/v1/chat/completions 或 https://generativelanguage.googleapis.com"
        rules={[
          { required: true, message: '请输入 API Host' },
          { type: 'url', message: '请输入有效的 URL' },
        ]}
      />

      <ProFormText
        name="model_name"
        label="模型名称"
        placeholder="例如: gpt-4, gpt-3.5-turbo, 你的部署 ID"
        rules={[{ required: true, message: '请输入模型名称' }]}
      />

      <ProFormSlider
        name="temperature"
        label="Temperature"
        tooltip="控制输出的随机性，值越大越随机"
        min={AI_MODEL_TEMPERATURE_CONFIG.MIN}
        max={AI_MODEL_TEMPERATURE_CONFIG.MAX}
        step={AI_MODEL_TEMPERATURE_CONFIG.STEP}
        initialValue={AI_MODEL_TEMPERATURE_CONFIG.DEFAULT}
        marks={AI_MODEL_TEMPERATURE_CONFIG.MARKS}
      />

      <ProFormDigit
        name="max_tokens"
        label="Max Tokens"
        tooltip="生成文本的最大令牌数"
        min={AI_MODEL_MAX_TOKENS_CONFIG.MIN}
        max={AI_MODEL_MAX_TOKENS_CONFIG.MAX}
        initialValue={AI_MODEL_MAX_TOKENS_CONFIG.DEFAULT}
        fieldProps={{
          style: { width: '100%' },
        }}
      />

      <ProFormDigit
        name="timeout"
        label="Timeout (秒)"
        tooltip="API 请求超时时间"
        min={AI_MODEL_TIMEOUT_CONFIG.MIN}
        max={AI_MODEL_TIMEOUT_CONFIG.MAX}
        initialValue={AI_MODEL_TIMEOUT_CONFIG.DEFAULT}
        fieldProps={{
          style: { width: '100%' },
        }}
      />

      <ProFormSwitch
        name="is_current"
        label="设为当前使用"
        tooltip={
          hasOtherCurrent
            ? '已有当前模型，需先取消后再设'
            : '将此配置设为当前使用的模型'
        }
        fieldProps={{
          disabled: hasOtherCurrent,
        }}
        transform={(value) => ({ is_current: value ? 1 : 0 })}
        convertValue={(value) => value === 1}
      />

      <ProFormSwitch
        name="is_active"
        label="启用配置"
        tooltip="是否启用此配置"
        initialValue={true}
        transform={(value) => ({ is_active: value ? 1 : 0 })}
        convertValue={(value) => value === 1}
      />

      {/* 连接测试区域 */}
      <Card
        title="连接测试"
        size="small"
        style={{ marginTop: 16, marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={handleTestConnection}
            loading={testLoading}
            block
          >
            测试连接
          </Button>

          {testResult && (
            <Alert
              message={testResult.success ? '连接成功' : '连接失败'}
              description={
                <>
                  <div>{testResult.message}</div>
                  {testResult.success && testResult.duration !== undefined && (
                    <div style={{ marginTop: 8, color: '#52c41a' }}>
                      响应时间: {(testResult.duration / 1000).toFixed(2)}s
                    </div>
                  )}
                </>
              }
              type={testResult.success ? 'success' : 'error'}
              icon={
                testResult.success ? (
                  <CheckCircleOutlined />
                ) : (
                  <CloseCircleOutlined />
                )
              }
              showIcon
              closable
              onClose={() => setTestResult(null)}
            />
          )}

          <div style={{ fontSize: 12, color: '#999' }}>
            提示：测试会发送固定问题“你是什么模型？”，使用当前表单数据，不会保存到数据库
          </div>
        </Space>
      </Card>
    </ModalForm>
  );
};

export default ModelForm;
