import {
  listTenderStaging,
  pushTenderStaging,
  syncTenderStaging,
} from '@/services/opportunity';
import TenderWebSearchModal from '@/pages/Opportunity/components/TenderWebSearchModal';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Button, Card, Col, message, Modal, Row, Space, Statistic, Tag } from 'antd';
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

const TenderPushPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [stats, setStats] = useState<API_OPPORTUNITY.TenderStagingStats>(defaultStats);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pushingId, setPushingId] = useState<number | null>(null);
  const [errorDetailRecord, setErrorDetailRecord] =
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
        }`
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

  const showErrorDetail = (record: API_OPPORTUNITY.TenderStagingRecord) => {
    setErrorDetailRecord(record);
  };

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
      renderText: (value) => value || '-',
    },
    {
      title: '截止日期',
      dataIndex: 'deadline_date',
      width: 120,
      search: false,
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

        return [
          <Link key="assess" to="/assessment/new">
            评估
          </Link>,
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
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待推送" value={stats.pending} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已推送" value={stats.pushed} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="失败" value={stats.failed} />
          </Card>
        </Col>
      </Row>

      <ProTable<API_OPPORTUNITY.TenderStagingRecord>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{
          labelWidth: 100,
        }}
        toolBarRender={() => [
          <Space key="actions">
            <Button type="primary" loading={syncLoading} onClick={handleSync}>
              同步本地数据
            </Button>
          </Space>,
        ]}
        request={async (params) => {
          const response = await listTenderStaging(params);
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
    </PageContainer>
  );
};

export default TenderPushPage;
