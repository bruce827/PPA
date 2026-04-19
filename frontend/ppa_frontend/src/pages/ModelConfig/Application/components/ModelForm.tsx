import {
  AI_MODEL_MAX_TOKENS_CONFIG,
  AI_MODEL_TEMPERATURE_CONFIG,
  AI_MODEL_TIMEOUT_CONFIG,
  AI_PROVIDER_LABELS,
  AI_PROVIDER_OPTIONS,
  isCherryStudioProvider,
  isGeminiProvider,
  isMinimaxProvider,
  isTavilyProvider,
  isVisionCapableProvider,
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
  currentVisionModelId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const ModelForm: React.FC<ModelFormProps> = ({
  visible,
  record,
  currentModelId,
  currentVisionModelId,
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
  const providerValue = Form.useWatch('provider', form);
  const supportsVisionValue = Form.useWatch('supports_vision', form);
  const isTavilySelected = isTavilyProvider(providerValue);
  const isCherryStudioSelected = isCherryStudioProvider(providerValue);
  const isGeminiSelected = isGeminiProvider(providerValue);
  const isMinimaxSelected = isMinimaxProvider(providerValue);
  const isVisionCapableSelected = isVisionCapableProvider(providerValue);
  const supportsVisionEnabled =
    supportsVisionValue === 1 || supportsVisionValue === true;
  const apiHostPlaceholder = isTavilySelected
    ? '例如：https://api.tavily.com/search'
    : isCherryStudioSelected
      ? '例如：https://open.cherryin.cc/ 或 https://open.cherryin.cc/v1/chat/completions'
      : '例如：https://api.openai.com/v1/chat/completions 或 https://generativelanguage.googleapis.com';
  const modelNamePlaceholder = isTavilySelected
    ? '例如：basic、advanced、fast、ultra-fast'
    : '例如: gpt-4, gpt-3.5-turbo, 你的部署 ID';
  const testPromptHint = isTavilySelected
    ? '提示：测试会发送固定检索词“Tavily Search API 是什么？”，使用当前表单数据，不会保存到数据库'
    : '提示：测试会发送固定问题“你是什么模型？”，使用当前表单数据，不会保存到数据库';
  const hasOtherCurrentVision =
    currentVisionModelId !== undefined &&
    (record?.id === undefined || currentVisionModelId !== record.id);

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

  useEffect(() => {
    if (!visible || !isTavilySelected) {
      return;
    }

    form.setFieldsValue({
      supports_web_search: 1,
      is_current: 0,
    });
  }, [visible, isTavilySelected, form]);

  useEffect(() => {
    if (!visible || isVisionCapableSelected) {
      return;
    }

    form.setFieldsValue({
      supports_vision: 0,
      is_current_vision: 0,
    });
  }, [visible, isVisionCapableSelected, form]);

  useEffect(() => {
    if (!visible || supportsVisionEnabled) {
      return;
    }

    const isCurrentVision = form.getFieldValue('is_current_vision');
    if (isCurrentVision === 1 || isCurrentVision === true) {
      form.setFieldValue('is_current_vision', 0);
    }
  }, [visible, supportsVisionEnabled, form]);

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

      {isTavilySelected && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${AI_PROVIDER_LABELS.TAVILY} 仅用于联网搜索`}
          description="Tavily 属于搜索型 Provider，会自动标记为支持联网搜索，且不能设为当前通用模型。模型名称字段可填写搜索档位，如 basic 或 advanced。"
        />
      )}

      {isCherryStudioSelected && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={AI_PROVIDER_LABELS.CHERRY_STUDIO}
          description="Cherry Studio 走 OpenAI 兼容协议。API Host 可填写站点根地址，后端会自动补全为 /v1/chat/completions；如果你已经填写了完整接口地址，也会原样使用。"
        />
      )}

      {isMinimaxSelected && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={AI_PROVIDER_LABELS.MINIMAX}
          description="MiniMax 将用于 Web3D Step4 图片识别。建议填写兼容视觉对话的接口地址或网关地址。"
        />
      )}

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
        placeholder={apiHostPlaceholder}
        rules={[
          { required: true, message: '请输入 API Host' },
          { type: 'url', message: '请输入有效的 URL' },
          {
            validator: async (_rule, value) => {
              if (!value || isTavilySelected || isCherryStudioSelected || isGeminiSelected) {
                return;
              }

              let parsed: URL;
              try {
                parsed = new URL(String(value));
              } catch (_error) {
                return;
              }

              const normalizedPathname =
                (parsed.pathname || '').replace(/\/+$/, '') || '/';

              if (normalizedPathname === '/' || normalizedPathname === '/v1') {
                throw new Error(
                  '该服务商请填写完整接口 URL，例如 https://api.openai.com/v1/chat/completions'
                );
              }
            },
          },
        ]}
        extra={
          isTavilySelected
            ? 'Tavily 请填写实际搜索接口 URL。'
            : isCherryStudioSelected
              ? 'Cherry Studio 可填写站点根地址，保存或测试时会自动补全为 /v1/chat/completions。'
              : isGeminiSelected
                ? 'Gemini 请填写基础地址，例如 https://generativelanguage.googleapis.com'
                : 'OpenAI 兼容服务请填写完整接口 URL，例如 https://api.openai.com/v1/chat/completions'
        }
      />

      <ProFormText
        name="model_name"
        label={isTavilySelected ? '搜索档位' : '模型名称'}
        placeholder={modelNamePlaceholder}
        rules={[{ required: true, message: '请输入模型名称' }]}
        extra={
          isTavilySelected
            ? 'Tavily 推荐填写 basic、advanced、fast 或 ultra-fast。'
            : undefined
        }
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
          isTavilySelected
            ? 'Tavily 仅可用于联网搜索，不能设为当前使用模型'
            : hasOtherCurrent
            ? '已有当前模型，需先取消后再设'
            : '将此配置设为当前使用的模型'
        }
        fieldProps={{
          disabled: hasOtherCurrent || isTavilySelected,
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

      <ProFormSwitch
        name="supports_web_search"
        label="支持联网搜索"
        tooltip={
          isTavilySelected
            ? 'Tavily 会自动启用联网搜索能力'
            : '开启后，该模型可用于全网检索场景'
        }
        initialValue={false}
        fieldProps={{
          disabled: isTavilySelected,
        }}
        transform={(value) => ({ supports_web_search: value ? 1 : 0 })}
        convertValue={(value) => value === 1}
      />

      <ProFormSwitch
        name="supports_vision"
        label="支持图片识别"
        tooltip={
          isVisionCapableSelected
            ? '开启后，该模型可用于 Web3D Step4 的图片识别分析'
            : '仅 Gemini / MiniMax provider 支持图片识别'
        }
        initialValue={false}
        fieldProps={{
          disabled: isTavilySelected || !isVisionCapableSelected,
        }}
        transform={(value) => ({ supports_vision: value ? 1 : 0 })}
        convertValue={(value) => value === 1}
      />

      <ProFormSwitch
        name="is_current_vision"
        label="设为当前视觉模型"
        tooltip={
          hasOtherCurrentVision
            ? '已有当前视觉模型，需先切换后再设'
            : !isVisionCapableSelected
              ? '仅 Gemini / MiniMax provider 可设为当前视觉模型'
              : !supportsVisionEnabled
                ? '请先开启图片识别能力'
                : '将此配置设为当前 Web3D 图片识别模型'
        }
        fieldProps={{
          disabled:
            hasOtherCurrentVision ||
            isTavilySelected ||
            !isVisionCapableSelected ||
            !supportsVisionEnabled,
        }}
        transform={(value) => ({ is_current_vision: value ? 1 : 0 })}
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
            {testPromptHint}
          </div>
        </Space>
      </Card>
    </ModalForm>
  );
};

export default ModelForm;
