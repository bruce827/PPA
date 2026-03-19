import { getAIModels } from '@/services/aiModel';
import { getTenderWebSearch, searchTenderWebSearch } from '@/services/opportunity';
import type { PromptTemplate } from '@/services/promptTemplate';
import { getPromptTemplates } from '@/services/promptTemplate';
import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

const { Link, Paragraph, Text } = Typography;

type TenderWebSearchModalProps = {
  open: boolean;
  record: API_OPPORTUNITY.TenderStagingRecord | null;
  draft: API_OPPORTUNITY.TenderWebSearchDraft;
  onDraftChange: (draft: API_OPPORTUNITY.TenderWebSearchDraft) => void;
  onCancel: () => void;
};

function renderText(value?: string | null) {
  return value && String(value).trim() ? value : '-';
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function normalizePromptTemplates(response: any): PromptTemplate[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
}

function isLikelyOfficialSource(item: API_OPPORTUNITY.TenderWebSearchResultItem) {
  const haystack = [item.site_name, item.site_url, item.page_title].join(' ');
  return /(gov\.cn|ccgp|公共资源|政府采购|交易中心|官网)/i.test(haystack);
}

const TenderWebSearchModal: React.FC<TenderWebSearchModalProps> = ({
  open,
  record,
  draft,
  onDraftChange,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeErrorMessage, setExecuteErrorMessage] = useState<string | null>(null);
  const [executionResult, setExecutionResult] =
    useState<API_OPPORTUNITY.TenderWebSearchExecutionResult | null>(null);
  const [data, setData] = useState<API_OPPORTUNITY.TenderWebSearchData | null>(null);
  const [modelOptions, setModelOptions] = useState<API.AIModelConfig[]>([]);
  const [templateOptions, setTemplateOptions] = useState<PromptTemplate[]>([]);

  const currentRecord = data?.record || record;
  const hasSavedResult = Boolean(data?.has_saved_result);
  const activeResult = executionResult || data?.saved_result || null;
  const activeResultSource = executionResult
    ? 'fresh'
    : data?.saved_result
      ? 'saved'
      : null;
  const canRefetch = Boolean(activeResult);
  const hasConfigOptions = modelOptions.length > 0 && templateOptions.length > 0;
  const officialResultCount = useMemo(() => {
    if (!activeResult) {
      return 0;
    }
    return activeResult.results.filter((item) => isLikelyOfficialSource(item)).length;
  }, [activeResult]);

  const updateDraft = (patch: Partial<API_OPPORTUNITY.TenderWebSearchDraft>) => {
    onDraftChange({
      ...draft,
      ...patch,
    });
  };

  useEffect(() => {
    if (!open || !record?.id) {
      setLoading(false);
      setErrorMessage(null);
      setData(null);
      setModelOptions([]);
      setTemplateOptions([]);
      setExecutionResult(null);
      setExecuteErrorMessage(null);
      setExecuting(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      setExecutionResult(null);
      setExecuteErrorMessage(null);

      try {
        const [contextResponse, modelResponse, templateResponse] = await Promise.all([
          getTenderWebSearch(record.id),
          getAIModels({ supports_web_search: 1, is_active: 1 }),
          getPromptTemplates({ category: 'web_search', is_active: 1 }),
        ]);

        if (!active) {
          return;
        }

        setData(contextResponse?.data || null);
        setModelOptions(modelResponse?.data || []);
        setTemplateOptions(normalizePromptTemplates(templateResponse));
      } catch (error: any) {
        if (!active) {
          return;
        }

        setData(null);
        setModelOptions([]);
        setTemplateOptions([]);
        setErrorMessage(error?.message || '加载全网检索上下文失败');
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextPatch: Partial<API_OPPORTUNITY.TenderWebSearchDraft> = {};

    if (draft.model_id && !modelOptions.some((item) => item.id === draft.model_id)) {
      nextPatch.model_id = undefined;
    }

    if (
      draft.prompt_template_id &&
      !templateOptions.some((item) => item.id === draft.prompt_template_id)
    ) {
      nextPatch.prompt_template_id = undefined;
    }

    if (Object.keys(nextPatch).length > 0) {
      updateDraft(nextPatch);
    }
  }, [open, draft.model_id, draft.prompt_template_id, modelOptions, templateOptions]);

  const handleExecuteSearch = async () => {
    if (!currentRecord?.id) {
      message.error('当前记录不存在，无法发起联网搜索');
      return;
    }

    if (!draft.model_id) {
      message.warning('请先选择搜索模型');
      return;
    }

    if (!draft.prompt_template_id) {
      message.warning('请先选择提示词模板');
      return;
    }

    const selectedModel = modelOptions.find((item) => item.id === draft.model_id);
    const selectedTemplate = templateOptions.find(
      (item) => item.id === draft.prompt_template_id,
    );

    if (!selectedModel) {
      message.error('当前所选模型已不可用，请重新选择');
      updateDraft({ model_id: undefined });
      return;
    }

    if (!selectedTemplate) {
      message.error('当前所选模板已不可用，请重新选择');
      updateDraft({ prompt_template_id: undefined });
      return;
    }

    setExecuting(true);
    setExecuteErrorMessage(null);

    try {
      const response = await searchTenderWebSearch(currentRecord.id, {
        model_id: selectedModel.id,
        prompt_template_id: selectedTemplate.id,
        focus_keywords: (draft.focus_keywords || '').trim(),
        exclude_keywords: (draft.exclude_keywords || '').trim(),
        max_results: draft.max_results || 5,
      });

      setExecutionResult(response?.data || null);
      setData((currentData) =>
        currentData
          ? {
              ...currentData,
              has_saved_result: true,
              saved_result: response?.data || null,
              state: 'has_saved_result',
            }
          : currentData
      );
      message.success(canRefetch ? '重新检索完成，已更新为最新结果' : '联网搜索执行完成');
    } catch (error: any) {
      const nextErrorMessage =
        error?.info?.message || error?.message || '联网搜索执行失败';
      setExecuteErrorMessage(nextErrorMessage);
      message.error(
        canRefetch
          ? `${nextErrorMessage}，已为你保留上一次成功结果`
          : nextErrorMessage
      );
    } finally {
      setExecuting(false);
    }
  };

  const configWarningDescription =
    modelOptions.length === 0 && templateOptions.length === 0
      ? '没有可用的联网搜索模型和提示词模板，请先在模型配置和提示词管理中启用。'
      : modelOptions.length === 0
        ? '没有可用的联网搜索模型，请先在模型配置中启用。'
        : '没有可用的联网搜索提示词模板，请先在提示词管理中启用。';

  const resultStateBanner = useMemo(() => {
    if (!activeResultSource || !activeResult) {
      return null;
    }

    if (activeResultSource === 'fresh') {
      return {
        type: 'success' as const,
        message: '当前展示的是本次新检索结果',
        description:
          '以下摘要和结果列表来自你刚刚完成的联网搜索，可直接用于判断该项目当前是否值得重点关注。',
        sourceTagColor: 'success',
        sourceTagText: '本次新结果',
      };
    }

    return {
      type: 'info' as const,
      message: '当前展示的是最近一次保存结果',
      description:
        '这些结果来自上一次成功保存的联网检索，可直接复用来判断项目重要性；如需刷新，再手动重新检索。',
      sourceTagColor: 'processing',
      sourceTagText: '已保存结果',
    };
  }, [activeResult, activeResultSource]);

  return (
    <Modal
      title={currentRecord ? `全网检索 - ${currentRecord.title}` : '全网检索'}
      open={open}
      onCancel={onCancel}
      width={920}
      footer={[
        <Button
          key="execute"
          type="primary"
          onClick={handleExecuteSearch}
          loading={executing}
          disabled={loading || executing || !hasConfigOptions}
        >
          {executing ? (canRefetch ? '重新检索中...' : '检索中...') : canRefetch ? '重新检索' : '开始检索'}
        </Button>,
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>,
      ]}
      destroyOnClose
    >
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Space direction="vertical" size="middle">
            <Spin size="large" />
            <Text type="secondary">正在加载招标上下文和最近一次保存结果…</Text>
          </Space>
        </div>
      ) : null}

      {!loading && errorMessage ? (
        <Alert
          type="error"
          showIcon
          message="加载全网检索上下文失败"
          description={errorMessage}
        />
      ) : null}

      {!loading && !errorMessage && currentRecord ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={hasSavedResult ? '已读取最近一次保存结果' : '当前暂无已保存的全网检索结果'}
            description={
              hasSavedResult
                ? '当前会优先展示最近一次成功保存的联网检索结果，无需重新联网即可查看。'
                : '后续联网检索完成后，最近一次保存结果会优先显示在这里。'
            }
          />

          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="项目名称" span={2}>
              {renderText(currentRecord.title)}
            </Descriptions.Item>
            <Descriptions.Item label="招标单位">
              {renderText(currentRecord.issuer)}
            </Descriptions.Item>
            <Descriptions.Item label="来源平台">
              {renderText(currentRecord.source_platform)}
            </Descriptions.Item>
            <Descriptions.Item label="发布日期">
              {renderText(currentRecord.published_date)}
            </Descriptions.Item>
            <Descriptions.Item label="截止日期">
              {renderText(currentRecord.deadline_date)}
            </Descriptions.Item>
            <Descriptions.Item label="原文链接" span={2}>
              {currentRecord.source_url ? (
                <Link href={currentRecord.source_url} target="_blank" rel="noreferrer">
                  {currentRecord.source_url}
                </Link>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="项目摘要" span={2}>
              <Paragraph style={{ marginBottom: 0 }}>
                {renderText(currentRecord.summary)}
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text strong>检索配置</Text>

            {!hasConfigOptions ? (
              <Alert
                type="warning"
                showIcon
                message="当前可用配置不完整，暂时无法执行联网搜索"
                description={configWarningDescription}
              />
            ) : null}

            <Space size="middle" align="start" wrap style={{ width: '100%' }}>
              <div style={{ minWidth: 240 }}>
                <Text type="secondary">搜索模型</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="请选择搜索模型"
                  value={draft.model_id}
                  onChange={(value) => updateDraft({ model_id: value })}
                  options={modelOptions.map((item) => ({
                    label: `${item.config_name} (${item.model_name})`,
                    value: item.id,
                  }))}
                  allowClear
                  disabled={executing}
                />
              </div>

              <div style={{ minWidth: 240 }}>
                <Text type="secondary">提示词模板</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="请选择提示词模板"
                  value={draft.prompt_template_id}
                  onChange={(value) => updateDraft({ prompt_template_id: value })}
                  options={templateOptions.map((item) => ({
                    label: item.template_name,
                    value: item.id,
                  }))}
                  allowClear
                  disabled={executing}
                />
              </div>

              <div style={{ minWidth: 120 }}>
                <Text type="secondary">返回条数</Text>
                <InputNumber
                  style={{ width: '100%', marginTop: 8 }}
                  min={1}
                  max={20}
                  value={draft.max_results}
                  onChange={(value) => updateDraft({ max_results: Number(value) || 5 })}
                  disabled={executing}
                />
              </div>
            </Space>

            <Space size="middle" align="start" wrap style={{ width: '100%' }}>
              <div style={{ minWidth: 320, flex: 1 }}>
                <Text type="secondary">补充关键词</Text>
                <Input
                  style={{ marginTop: 8 }}
                  placeholder="例如：智慧园区, 数据治理, 可视化平台"
                  value={draft.focus_keywords}
                  onChange={(event) => updateDraft({ focus_keywords: event.target.value })}
                  disabled={executing}
                />
              </div>

              <div style={{ minWidth: 320, flex: 1 }}>
                <Text type="secondary">排除关键词</Text>
                <Input
                  style={{ marginTop: 8 }}
                  placeholder="例如：培训, 物业, 食堂"
                  value={draft.exclude_keywords}
                  onChange={(event) => updateDraft({ exclude_keywords: event.target.value })}
                  disabled={executing}
                />
              </div>
            </Space>
          </Space>

          {executing ? (
            <Alert
              type="info"
              showIcon
              message="正在执行联网搜索"
              description="系统正在基于当前招标记录、所选模型和模板执行高相关联网检索，请稍候。"
            />
          ) : null}

          {executeErrorMessage ? (
            <Alert
              type="error"
              showIcon
              message={canRefetch ? '重新检索失败' : '联网搜索执行失败'}
              description={
                canRefetch
                  ? `${executeErrorMessage}。当前仍保留上一份成功结果，你可以稍后再试。`
                  : executeErrorMessage
              }
            />
          ) : null}

          {resultStateBanner ? (
            <Alert
              type={resultStateBanner.type}
              showIcon
              message={resultStateBanner.message}
              description={
                <Space direction="vertical" size={8}>
                  <Text>{resultStateBanner.description}</Text>
                  <Space wrap size={[8, 8]}>
                    <Tag color={resultStateBanner.sourceTagColor}>
                      {resultStateBanner.sourceTagText}
                    </Tag>
                    <Text type="secondary">
                      最近检索时间：{formatDateTime(activeResult?.searched_at)}
                    </Text>
                  </Space>
                </Space>
              }
            />
          ) : null}

          {activeResult ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: 16,
                  background: '#fafafa',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space wrap size={[8, 8]}>
                    <Text strong style={{ fontSize: 16 }}>
                      检索摘要
                    </Text>
                    {resultStateBanner ? (
                      <Tag color={resultStateBanner.sourceTagColor}>
                        {resultStateBanner.sourceTagText}
                      </Tag>
                    ) : null}
                    <Tag color={activeResult.state === 'empty_result' ? 'warning' : 'success'}>
                      {activeResult.state === 'empty_result' ? '空结果' : '检索完成'}
                    </Tag>
                    <Tag>共 {activeResult.result_count} 条结果</Tag>
                    {activeResult.result_count > 0 ? (
                      <Tag color="processing">官方/权威来源 {officialResultCount} 条</Tag>
                    ) : null}
                  </Space>

                  <Paragraph style={{ marginBottom: 0 }}>{activeResult.summary}</Paragraph>

                  <Space wrap size={[8, 8]}>
                    <Text type="secondary">
                      最近检索时间：{formatDateTime(activeResult.searched_at)}
                    </Text>
                    <Text type="secondary">点击网站名称将在新标签页打开原站页面</Text>
                  </Space>
                </Space>
              </div>

              {activeResult.state === 'empty_result' ? (
                <Empty description={activeResult.summary} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Collapse
                  items={activeResult.results.map((item, index) => ({
                    key: `${item.site_url}-${index}`,
                    label: (
                      <Space
                        wrap
                        size={[8, 8]}
                        style={{ width: '100%', justifyContent: 'space-between' }}
                      >
                        <Space wrap size={[8, 8]}>
                          <Link
                            href={item.site_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {item.site_name}
                          </Link>
                          <Text strong>{item.page_title}</Text>
                        </Space>

                        <Space wrap size={[8, 8]}>
                          <Tag>{item.content_type || '其他'}</Tag>
                          <Text type="secondary">
                            {item.published_at || '发布时间未知'}
                          </Text>
                          {typeof item.confidence === 'number' ? (
                            <Text type="secondary">
                              置信度 {Math.round(item.confidence * 100)}%
                            </Text>
                          ) : null}
                        </Space>
                      </Space>
                    ),
                    children: (
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                          <Text strong>相关内容</Text>
                          <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                            {item.snippet}
                          </Paragraph>
                        </div>

                        <div>
                          <Text strong>关联原因</Text>
                          <Paragraph style={{ marginTop: 8, marginBottom: 0 }} type="secondary">
                            {item.relevance_reason}
                          </Paragraph>
                        </div>

                        <div>
                          <Text strong>网站链接</Text>
                          <div style={{ marginTop: 8 }}>
                            <Link href={item.site_url} target="_blank" rel="noreferrer">
                              {item.site_url}
                            </Link>
                          </div>
                        </div>
                      </Space>
                    ),
                  }))}
                />
              )}
            </Space>
          ) : hasSavedResult ? null : (
            <Empty
              description="当前还没有可展示的全网检索结果，完成一次联网搜索后会在这里查看摘要与来源。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Space>
      ) : null}
    </Modal>
  );
};

export default TenderWebSearchModal;
