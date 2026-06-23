import {
  archiveTenderSourceFiles,
  executeTenderDedupe,
  listTenderStaging,
  previewTenderDedupe,
  pushTenderStaging,
  syncTenderStaging,
} from '@/services/opportunity';
import TenderFieldParseModal from '@/pages/Opportunity/components/TenderFieldParseModal';
import TenderWebSearchModal from '@/pages/Opportunity/components/TenderWebSearchModal';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Button, Card, Col, message, Modal, Row, Space, Tag } from 'antd';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import React, { useRef, useState } from 'react';

const pushStatusMap: Record<
  API_OPPORTUNITY.TenderPushStatus,
  { text: string; color: string }
> = {
  pending: { text: '待推送', color: 'processing' },
  pushed: { text: '已推送', color: 'success' },
  failed: { text: '推送失败', color: 'error' },
};

const defaultStats: API_OPPORTUNITY.TenderStagingStats = {
  total: 0,
  pending: 0,
  pushed: 0,
  failed: 0,
};

const defaultWebSearchDraft: API_OPPORTUNITY.TenderWebSearchDraft = {
  focus_keywords: '',
  exclude_keywords: '',
  max_results: 5,
};

const dedupeReasonTextMap: Record<string, string> = {
  same_code: '编号一致',
  same_url: '链接一致',
  same_title: '标题一致',
  same_text_prefix: '正文前缀一致',
  same_meta: '关键字段一致',
};

const dedupeSkipReasonTextMap: Record<string, string> = {
  multiple_traced_records: '组内存在多条有操作痕迹的数据，已跳过',
  candidate_only: '仅命中候选条件，未达到自动硬删标准',
};

const dataQualityMap = {
  missing_issuer: { text: '缺招标单位', color: 'warning' },
  missing_deadline: { text: '缺截止日期', color: 'orange' },
  missing_content: { text: '缺正文', color: 'error' },
} as const;

const extractParseableText = (record: API_OPPORTUNITY.TenderStagingRecord) => {
  const plainText = String(record.announcement_plain_text || '').trim();
  if (plainText) {
    return plainText;
  }

  const detailExcerpt = String(record.detail_excerpt || '').trim();
  if (detailExcerpt) {
    return detailExcerpt;
  }

  return String(record.announcement_html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const hasParseableContent = (record: API_OPPORTUNITY.TenderStagingRecord) =>
  Boolean(extractParseableText(record));

const getDataQualityIssues = (record: API_OPPORTUNITY.TenderStagingRecord) => {
  const issues: Array<keyof typeof dataQualityMap> = [];

  if (!String(record.issuer || '').trim()) {
    issues.push('missing_issuer');
  }

  if (!String(record.deadline_date || '').trim()) {
    issues.push('missing_deadline');
  }

  if (!hasParseableContent(record)) {
    issues.push('missing_content');
  }

  return issues;
};

const TenderPushPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [stats, setStats] = useState<API_OPPORTUNITY.TenderStagingStats>(defaultStats);
  const [syncLoading, setSyncLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [dedupeLoading, setDedupeLoading] = useState(false);
  const [dedupeExecuting, setDedupeExecuting] = useState(false);
  const [pushingId, setPushingId] = useState<number | null>(null);
  const [dedupePreview, setDedupePreview] =
    useState<API_OPPORTUNITY.TenderDedupePreviewResult | null>(null);
  const [dedupeModalOpen, setDedupeModalOpen] = useState(false);
  const [errorDetailRecord, setErrorDetailRecord] =
    useState<API_OPPORTUNITY.TenderStagingRecord | null>(null);
  const [parseRecord, setParseRecord] =
    useState<API_OPPORTUNITY.TenderStagingRecord | null>(null);
  const [webSearchRecord, setWebSearchRecord] =
    useState<API_OPPORTUNITY.TenderStagingRecord | null>(null);
  const [webSearchDraft, setWebSearchDraft] = useState<API_OPPORTUNITY.TenderWebSearchDraft>(
    defaultWebSearchDraft,
  );

  const handleSync = async () => {
    try {
      setSyncLoading(true);
      const response = await syncTenderStaging();
      const summary = response?.data;
      const errorCount = summary?.errors?.length || 0;
      message.success(
        `同步完成：文件 ${summary?.fileCount || 0} 个，当前目录有效 ${
          summary?.deduplicatedCount || 0
        } 条，新增 ${summary?.created || 0}，更新 ${summary?.updated || 0}，清理 ${
          summary?.pruned || 0
        }，保留 ${summary?.preservedWithTrace || 0}`
      );
      if (errorCount > 0) {
        message.warning(`同步过程中有 ${errorCount} 条告警，请查看服务端返回`);
      }
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.message || '同步本地数据失败');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleArchiveSourceFiles = async () => {
    try {
      setArchiveLoading(true);
      const response = await archiveTenderSourceFiles();
      const summary = response?.data;

      if (!summary?.fileCount) {
        message.info('当前没有可归档的 JSON 文件');
        return;
      }

      message.success(
        `已归档 ${summary.fileCount} 个文件到 ${summary.archiveDirectoryPath || '备份目录'}`
      );
    } catch (error: any) {
      message.error(error?.message || '归档源文件失败');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handlePreviewDedupe = async () => {
    try {
      setDedupeLoading(true);
      const response = await previewTenderDedupe();
      const result = response?.data;

      if (!result?.groups_total) {
        message.info('未发现可整理的重复数据');
        return;
      }

      setDedupePreview(result);
      setDedupeModalOpen(true);
    } catch (error: any) {
      message.error(error?.message || '扫描重复数据失败');
    } finally {
      setDedupeLoading(false);
    }
  };

  const handleExecuteDedupe = async () => {
    const groupKeys =
      dedupePreview?.groups
        ?.filter((group) => group.action === 'auto_delete')
        .map((group) => group.group_key) || [];

    if (groupKeys.length === 0) {
      message.info('当前没有可自动整理的数据');
      return;
    }

    try {
      setDedupeExecuting(true);
      const response = await executeTenderDedupe({
        group_keys: groupKeys,
      });
      const result = response?.data;
      message.success(
        `整理完成：删除重复记录 ${result?.deleted_staging_count || 0} 条，清理检索结果 ${
          result?.deleted_web_search_count || 0
        } 条`
      );
      setDedupeModalOpen(false);
      setDedupePreview(null);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.message || '整理数据失败');
    } finally {
      setDedupeExecuting(false);
    }
  };

  const handlePush = async (record: API_OPPORTUNITY.TenderStagingRecord) => {
    try {
      setPushingId(record.id);
      const response = await pushTenderStaging(record.id);
      const result = response?.data;
      if (result?.error) {
        message.error(result.error);
      } else {
        message.success('推送成功，小程序端现在可以查看这条数据');
      }
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.message || '推送失败');
    } finally {
      setPushingId(null);
    }
  };

  const handleParse = async (record: API_OPPORTUNITY.TenderStagingRecord) => {
    if (!hasParseableContent(record)) {
      message.info('当前记录无正文，不可解析');
      return;
    }

    if (record.issuer && record.deadline_date) {
      message.info('字段已完整，无需解析');
      return;
    }
    setParseRecord(record);
  };

  const showErrorDetail = (record: API_OPPORTUNITY.TenderStagingRecord) => {
    setErrorDetailRecord(record);
  };

  const autoDeleteGroupKeys =
    dedupePreview?.groups
      ?.filter((group) => group.action === 'auto_delete')
      .map((group) => group.group_key) || [];

  const columns: ProColumns<API_OPPORTUNITY.TenderStagingRecord>[] = [
    {
      title: '项目名称',
      dataIndex: 'title',
      ellipsis: true,
      width: 260,
    },
    {
      title: '发布日期',
      dataIndex: 'published_date',
      width: 120,
      search: false,
      sorter: true,
      renderText: (value) => value || '-',
    },
    {
      title: '截止日期',
      dataIndex: 'deadline_date',
      width: 120,
      search: false,
      sorter: true,
      renderText: (value) => value || '-',
    },
    {
      title: '招标单位',
      dataIndex: 'issuer',
      ellipsis: true,
      width: 220,
      renderText: (value) => value || '-',
    },
    {
      title: '数据完整性',
      dataIndex: 'data_quality',
      valueType: 'select',
      width: 180,
      valueEnum: {
        missing_issuer: { text: dataQualityMap.missing_issuer.text },
        missing_deadline: { text: dataQualityMap.missing_deadline.text },
        missing_content: { text: dataQualityMap.missing_content.text },
      },
      fieldProps: {
        mode: 'multiple',
        placeholder: '全部',
      },
      render: (_, record) => {
        const issues = getDataQualityIssues(record);

        if (issues.length === 0) {
          return <Tag color="success">完整</Tag>;
        }

        return (
          <Space size={[0, 4]} wrap>
            {issues.map((issue) => (
              <Tag key={issue} color={dataQualityMap[issue].color}>
                {dataQualityMap[issue].text}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '来源文件',
      dataIndex: 'source_file',
      width: 180,
      ellipsis: true,
    },
    {
      title: '推送状态',
      dataIndex: 'push_status',
      valueType: 'select',
      width: 120,
      align: 'center',
      sorter: true,
      valueEnum: {
        pending: { text: '待推送' },
        pushed: { text: '已推送' },
        failed: { text: '推送失败' },
      },
      render: (_, record) => {
        const status = pushStatusMap[record.push_status];
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 320,
      render: (_, record) => {
        const buttonLabel =
          record.push_status === 'failed'
            ? '重试'
            : record.push_status === 'pushed'
              ? '重新推送'
              : '推送';
        const parseDisabled = !hasParseableContent(record);

        return [
          <Link key="assess" to="/assessment/new">
            评估
          </Link>,
          <Button
            key="parse"
            type="link"
            disabled={parseDisabled}
            onClick={() => handleParse(record)}
          >
            解析
          </Button>,
          <Button
            key="web-search"
            type="link"
            onClick={() => setWebSearchRecord(record)}
          >
            全网检索
          </Button>,
          record.source_url ? (
            <a
              key="source"
              href={record.source_url}
              target="_blank"
              rel="noreferrer"
            >
              原文
            </a>
          ) : null,
          record.push_error ? (
            <Button key="error" type="link" onClick={() => showErrorDetail(record)}>
              错误信息
            </Button>
          ) : null,
          <Button
            key="push"
            type="link"
            loading={pushingId === record.id}
            onClick={() => handlePush(record)}
          >
            {buttonLabel}
          </Button>,
        ];
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: '待推送招标',
        subTitle: '以 spider/data 为当前真源全量同步到 staging，再单条推送到小程序',
      }}
    >
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '10px 16px' }}
      >
        <Row gutter={[24, 8]}>
          <Col xs={12} sm={12} md={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'rgba(0, 0, 0, 0.65)' }}>总数</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{stats.total}</span>
            </div>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'rgba(0, 0, 0, 0.65)' }}>待推送</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{stats.pending}</span>
            </div>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'rgba(0, 0, 0, 0.65)' }}>已推送</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{stats.pushed}</span>
            </div>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'rgba(0, 0, 0, 0.65)' }}>失败</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{stats.failed}</span>
            </div>
          </Col>
        </Row>
      </Card>

      <ProTable<API_OPPORTUNITY.TenderStagingRecord>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1540 }}
        search={{
          labelWidth: 100,
        }}
        toolBarRender={() => [
          <Space key="actions">
            <Button type="primary" loading={syncLoading} onClick={handleSync}>
              同步本地数据
            </Button>
            <Button
              loading={archiveLoading}
              onClick={handleArchiveSourceFiles}
            >
              归档源文件
            </Button>
            <Button loading={dedupeLoading} onClick={handlePreviewDedupe}>
              整理数据
            </Button>
          </Space>,
        ]}
        request={async (params, sorter) => {
          const [sortBy, sortOrderRaw] =
            Object.entries(sorter || {}).find(([, order]) => !!order) || [];
          const sortOrder =
            sortOrderRaw === 'ascend'
              ? 'asc'
              : sortOrderRaw === 'descend'
                ? 'desc'
                : undefined;
          const queryParams = { ...params };
          if (Array.isArray(queryParams.data_quality)) {
            queryParams.data_quality = queryParams.data_quality.join(',');
          }
          const response = await listTenderStaging(
            sortBy && sortOrder
              ? {
                  ...queryParams,
                  sort_by: sortBy,
                  sort_order: sortOrder,
                }
              : queryParams,
          );
          const result = response?.data;
          setStats(result?.stats || defaultStats);
          return {
            data: result?.items || [],
            success: response?.success,
            total: result?.total || 0,
          };
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <Modal
        title="整理数据"
        open={dedupeModalOpen}
        onCancel={() => {
          setDedupeModalOpen(false);
          setDedupePreview(null);
        }}
        onOk={handleExecuteDedupe}
        okText={`确认硬删除 ${dedupePreview?.delete_candidate_count || 0} 条`}
        okButtonProps={{
          danger: true,
          disabled: autoDeleteGroupKeys.length === 0,
        }}
        confirmLoading={dedupeExecuting}
        cancelText="关闭"
        width={920}
      >
        <Space wrap size={[8, 8]} style={{ marginBottom: 16 }}>
          <Tag color="processing">扫描 {dedupePreview?.scanned_record_count || 0} 条</Tag>
          <Tag color="error">
            可自动清理 {dedupePreview?.auto_deletable_groups || 0} 组
          </Tag>
          <Tag color="warning">
            可删除 {dedupePreview?.delete_candidate_count || 0} 条
          </Tag>
          <Tag>
            疑似重复 {dedupePreview?.review_only_groups || 0} 组
          </Tag>
        </Space>

        <div style={{ marginBottom: 16, color: 'rgba(0, 0, 0, 0.65)' }}>
          只会自动删除高置信重复数据。仅命中标题或链接候选、但未达到强匹配条件的数据，会保留并标记为“已跳过”。
        </div>

        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {(dedupePreview?.groups || []).map((group) => (
            <Card
              key={group.group_key}
              size="small"
              style={{ marginBottom: 12 }}
              bodyStyle={{ padding: 12 }}
            >
              <Space wrap size={[8, 8]} style={{ marginBottom: 8 }}>
                <Tag color={group.action === 'auto_delete' ? 'error' : 'default'}>
                  {group.action === 'auto_delete' ? '可自动删除' : '已跳过'}
                </Tag>
                {group.reason_keys.map((reasonKey) => (
                  <Tag key={reasonKey}>{dedupeReasonTextMap[reasonKey] || reasonKey}</Tag>
                ))}
              </Space>

              <div style={{ marginBottom: 8 }}>
                保留记录：#{group.keeper_id}，{group.keeper_reason}
              </div>

              {group.skipped_reason ? (
                <div style={{ marginBottom: 8, color: '#a61d24' }}>
                  {dedupeSkipReasonTextMap[group.skipped_reason] || group.skipped_reason}
                </div>
              ) : (
                <div style={{ marginBottom: 8, color: '#a61d24' }}>
                  将硬删除 {group.delete_ids.length} 条重复记录
                </div>
              )}

              <div>
                {group.records.map((record) => (
                  <div
                    key={record.id}
                    style={{
                      padding: '8px 0',
                      borderTop: '1px solid #f0f0f0',
                    }}
                  >
                    <Space wrap size={[8, 8]}>
                      <Tag color={record.is_keeper ? 'success' : 'default'}>
                        #{record.id}
                      </Tag>
                      {record.is_keeper ? <Tag color="success">保留</Tag> : null}
                      {record.has_push_trace ? <Tag color="blue">推送痕迹</Tag> : null}
                      {record.has_web_search_trace ? <Tag color="purple">检索痕迹</Tag> : null}
                      {record.has_parse_trace ? <Tag color="gold">解析痕迹</Tag> : null}
                    </Space>
                    <div style={{ marginTop: 6 }}>{record.title}</div>
                    <div style={{ marginTop: 4, color: 'rgba(0, 0, 0, 0.65)' }}>
                      {[
                        record.extracted_code ? `编号：${record.extracted_code}` : null,
                        record.published_date ? `发布日期：${record.published_date}` : null,
                        record.deadline_date ? `截止：${record.deadline_date}` : null,
                        record.issuer ? `招标单位：${record.issuer}` : null,
                        `正文长度：${record.text_length}`,
                      ]
                        .filter(Boolean)
                        .join(' ｜ ')}
                    </div>
                    {record.source_url ? (
                      <div
                        style={{
                          marginTop: 4,
                          color: 'rgba(0, 0, 0, 0.45)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {record.source_url}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      <Modal
        title={errorDetailRecord ? `错误信息 - ${errorDetailRecord.title}` : '错误信息'}
        open={Boolean(errorDetailRecord)}
        onCancel={() => setErrorDetailRecord(null)}
        footer={null}
        width={720}
      >
        <div
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.7,
          }}
        >
          {errorDetailRecord?.push_error || '暂无错误信息'}
        </div>
      </Modal>

      <TenderWebSearchModal
        open={Boolean(webSearchRecord)}
        record={webSearchRecord}
        draft={webSearchDraft}
        onDraftChange={setWebSearchDraft}
        onCancel={() => setWebSearchRecord(null)}
      />

      <TenderFieldParseModal
        open={Boolean(parseRecord)}
        record={parseRecord}
        onCancel={() => setParseRecord(null)}
        onSuccess={(result) => {
          const updatedFields = result?.updated_fields || [];
          const warnings = result?.warnings || [];

          if (updatedFields.length > 0) {
            const labels = updatedFields.map((field) =>
              field === 'issuer' ? '招标单位' : field === 'deadline_date' ? '截止日期' : field,
            );
            message.success(`已补充：${labels.join('、')}`);
          } else {
            message.info(warnings[0] || '未识别到可补充字段');
          }

          setParseRecord(null);
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default TenderPushPage;
