import { parseTenderStagingFields } from '@/services/opportunity';
import type { PromptTemplate } from '@/services/promptTemplate';
import { getPromptTemplates } from '@/services/promptTemplate';
import {
  Alert,
  Descriptions,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

const { Paragraph, Text } = Typography;

type TenderFieldParseModalProps = {
  open: boolean;
  record: API_OPPORTUNITY.TenderStagingRecord | null;
  onCancel: () => void;
  onSuccess: (result: API_OPPORTUNITY.TenderStagingParseResult) => void;
};

function normalizePromptTemplates(response: any): PromptTemplate[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
}

function extractParseableText(record: API_OPPORTUNITY.TenderStagingRecord | null) {
  if (!record) {
    return '';
  }

  const plainText = String(record.announcement_plain_text || '').trim();
  if (plainText) {
    return plainText;
  }

  return String(record.announcement_html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TenderFieldParseModal: React.FC<TenderFieldParseModalProps> = ({
  open,
  record,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templateOptions, setTemplateOptions] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);

  const parseableText = useMemo(() => extractParseableText(record), [record]);
  const hasParseableContent = Boolean(parseableText);
  const isAlreadyComplete = Boolean(record?.issuer && record?.deadline_date);
  const previewText = useMemo(() => parseableText.slice(0, 800), [parseableText]);

  useEffect(() => {
    if (!open || !record?.id) {
      setLoading(false);
      setExecuting(false);
      setErrorMessage(null);
      setTemplateOptions([]);
      setSelectedTemplateId(undefined);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await getPromptTemplates({
          category: 'tender_field_parse',
          is_active: 1,
          pageSize: 100,
        });
        if (!active) {
          return;
        }

        const nextOptions = normalizePromptTemplates(response);
        setTemplateOptions(nextOptions);
        setSelectedTemplateId(nextOptions[0]?.id);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setTemplateOptions([]);
        setSelectedTemplateId(undefined);
        setErrorMessage(error?.message || '加载解析模板失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [open, record?.id]);

  const handleExecute = async () => {
    if (!record?.id) {
      message.error('当前记录不存在，无法执行解析');
      return;
    }

    if (!hasParseableContent) {
      message.info('当前记录无正文，不可解析');
      return;
    }

    if (isAlreadyComplete) {
      message.info('字段已完整，无需解析');
      return;
    }

    if (!selectedTemplateId) {
      message.warning('请先选择提示词模板');
      return;
    }

    const selectedTemplate = templateOptions.find((item) => item.id === selectedTemplateId);
    if (!selectedTemplate) {
      message.error('当前所选模板已不可用，请重新选择');
      setSelectedTemplateId(undefined);
      return;
    }

    try {
      setExecuting(true);
      const response = await parseTenderStagingFields(record.id, {
        prompt_template_id: selectedTemplate.id,
      });
      onSuccess(response?.data);
    } catch (error: any) {
      message.error(error?.message || '解析失败');
    } finally {
      setExecuting(false);
    }
  };

  const disabledReason = !hasParseableContent
    ? '当前记录无正文，不可解析'
    : isAlreadyComplete
      ? '字段已完整，无需解析'
      : templateOptions.length === 0
        ? '未找到可用的招标字段解析模板'
        : null;

  return (
    <Modal
      title="招标字段解析"
      open={open}
      onCancel={onCancel}
      onOk={handleExecute}
      okText="开始解析"
      cancelText="取消"
      confirmLoading={executing}
      okButtonProps={{
        disabled: loading || Boolean(disabledReason),
      }}
      width={760}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {errorMessage ? (
            <Alert type="error" showIcon message="加载失败" description={errorMessage} />
          ) : null}

          {disabledReason ? (
            <Alert type="info" showIcon message={disabledReason} />
          ) : null}

          {!disabledReason && templateOptions.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="未找到招标字段解析模板"
              description="请先在提示词管理中创建或启用 category 为 tender_field_parse 的模板。"
            />
          ) : null}

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="项目名称">
              {record?.title || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="当前字段">
              {[
                record?.issuer ? `招标单位：${record.issuer}` : '招标单位待补充',
                record?.deadline_date ? `截止日期：${record.deadline_date}` : '截止日期待补充',
              ].join(' ｜ ')}
            </Descriptions.Item>
            <Descriptions.Item label="来源文件">
              {record?.source_file || '-'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Text type="secondary">提示词模板</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="请选择提示词模板"
              value={selectedTemplateId}
              onChange={(value) => setSelectedTemplateId(value)}
              options={templateOptions.map((item) => ({
                value: item.id,
                label: item.template_name,
              }))}
            />
          </div>

          <div>
            <Text type="secondary">正文预览</Text>
            <Paragraph
              style={{
                marginTop: 8,
                marginBottom: 0,
                maxHeight: 220,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: 12,
                background: '#fafafa',
              }}
            >
              {previewText || '暂无可用正文'}
            </Paragraph>
          </div>
        </Space>
      )}
    </Modal>
  );
};

export default TenderFieldParseModal;
