import { validatePush as validatePushApi, pushProject as pushProjectApi } from '@/services/assessment/pushApi';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Button, Form, InputNumber, message, Modal, Space, Spin, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Text } = Typography;

type PushStatus = 'idle' | 'validating' | 'uploading' | 'pushing' | 'success' | 'failed';

interface PushModalProps {
  open: boolean;
  projectId: number;
  projectName: string;
  projectRiskScore?: number;
  projectQuoteTotal?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function PushModal({
  open,
  projectId,
  projectName,
  projectRiskScore,
  projectQuoteTotal,
  onCancel,
  onSuccess,
}: PushModalProps) {
  const [form] = Form.useForm();
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [validationResult, setValidationResult] = useState<{
    hasBusinessQuote: boolean;
    attachmentCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const runValidation = useCallback(async () => {
    if (!projectId) return;
    try {
      setPushStatus('validating');
      const res = await validatePushApi(projectId, 0); // 预算为 0 仅做格式校验
      if (res?.success) {
        setValidationResult(res.data);
        setPushStatus('idle');
      }
    } catch {
      // 校验不通过也记录下来
      setValidationResult(null);
      setPushStatus('idle');
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      setPushStatus('validating');
      setValidationResult(null);
      setErrorMessage('');
      form.resetFields();
      runValidation();
    }
  }, [open, runValidation, form]);

  const handlePush = async () => {
    try {
      const values = await form.validateFields();
      const customerBudget = Number(values.customerBudget);

      if (!customerBudget || customerBudget <= 0) {
        message.error('请输入有效的预算金额');
        return;
      }

      setPushStatus('validating');
      setErrorMessage('');

      // 1. 校验
      await validatePushApi(projectId, customerBudget);

      // 2. 推送
      setPushStatus('pushing');
      const res = await pushProjectApi(projectId, customerBudget);

      if (res?.success) {
        setPushStatus('success');
        message.success('推送成功');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setPushStatus('failed');
        setErrorMessage('推送失败，请重试');
      }
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || e?.message || '推送失败';
      setPushStatus('failed');
      setErrorMessage(errMsg);
    }
  };

  const isLoading = ['validating', 'uploading', 'pushing'].includes(pushStatus);
  const isFinished = pushStatus === 'success';

  const getButtonText = () => {
    switch (pushStatus) {
      case 'validating':
        return '校验中...';
      case 'uploading':
        return '上传中...';
      case 'pushing':
        return '推送中...';
      case 'success':
        return '推送成功';
      case 'failed':
        return '推送失败';
      default:
        return '确认推送';
    }
  };

  const canPush =
    validationResult?.hasBusinessQuote &&
    (validationResult.attachmentCount ?? 0) > 0;

  return (
    <Modal
      title="推送到小程序"
      open={open}
      onCancel={() => {
        if (isLoading) return;
        onCancel();
      }}
      destroyOnHidden
      maskClosable={!isLoading}
      footer={
        <Space>
          <Button
            onClick={() => {
              if (isLoading) return;
              onCancel();
            }}
            disabled={isLoading && pushStatus !== 'failed'}
          >
            取消
          </Button>
          <Button
            type="primary"
            loading={isLoading}
            disabled={!canPush || isFinished}
            onClick={handlePush}
          >
            {getButtonText()}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 项目摘要 */}
        <Space direction="vertical" size="small">
          <Text strong>项目信息</Text>
          <Space wrap>
            <Tag color="blue">{projectName}</Tag>
            {projectQuoteTotal != null && (
              <Tag color="orange">报价: {projectQuoteTotal.toFixed(2)} 万元</Tag>
            )}
            {projectRiskScore != null && (
              <Tag
                color={
                  projectRiskScore >= 70
                    ? 'red'
                    : projectRiskScore >= 40
                    ? 'gold'
                    : 'green'
                }
              >
                风险: {projectRiskScore}
              </Tag>
            )}
          </Space>
        </Space>

        {/* 前置校验结果 */}
        <Space direction="vertical" size="small">
          <Text strong>前置校验</Text>
          {pushStatus === 'validating' && !validationResult ? (
            <Spin size="small" />
          ) : validationResult ? (
            <Space direction="vertical">
              <Space>
                {validationResult.hasBusinessQuote ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text>商务报价: {validationResult.hasBusinessQuote ? '已完成' : '未完成'}</Text>
              </Space>
              <Space>
                {(validationResult.attachmentCount ?? 0) > 0 ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text>
                  附件: {validationResult.attachmentCount ?? 0} 个
                </Text>
              </Space>
            </Space>
          ) : (
            <Text type="danger">校验失败，无法推送</Text>
          )}
        </Space>

        {/* 预算输入 */}
        {canPush && pushStatus !== 'success' && (
          <Form form={form} layout="vertical">
            <Form.Item
              label="客户预算（万元）"
              name="customerBudget"
              rules={[
                { required: true, message: '请输入客户预算' },
                {
                  validator: (_rule, value) => {
                    if (value == null || value <= 0) {
                      return Promise.reject(new Error('预算必须大于 0'));
                    }
                    if (String(value).includes('.') && String(value).split('.')[1]?.length > 2) {
                      return Promise.reject(new Error('最多两位小数'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入客户预算"
                min={0.01}
                precision={2}
                disabled={isLoading}
              />
            </Form.Item>
          </Form>
        )}

        {/* 错误提示 */}
        {pushStatus === 'failed' && errorMessage && (
          <Text type="danger">{errorMessage}</Text>
        )}
      </Space>
    </Modal>
  );
}
