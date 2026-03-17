import {
  listTenderStaging,
  pushTenderStaging,
  syncTenderStaging,
} from '@/services/opportunity';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Card, Col, message, Row, Space, Statistic, Tag, Tooltip } from 'antd';
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

const TenderPushPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [stats, setStats] = useState<API_OPPORTUNITY.TenderStagingStats>(defaultStats);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pushingId, setPushingId] = useState<number | null>(null);

  const handleSync = async () => {
    try {
      setSyncLoading(true);
      const response = await syncTenderStaging();
      const summary = response?.data;
      const errorCount = summary?.errors?.length || 0;
      message.success(
        `同步完成：文件 ${summary?.fileCount || 0} 个，去重后 ${
          summary?.deduplicatedCount || 0
        } 条，新增 ${summary?.created || 0}，更新 ${summary?.updated || 0}`
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
      title: '错误信息',
      dataIndex: 'push_error',
      search: false,
      ellipsis: true,
      render: (_, record) =>
        record.push_error ? (
          <Tooltip title={record.push_error}>{record.push_error}</Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '原文',
      dataIndex: 'source_url',
      search: false,
      width: 90,
      render: (_, record) =>
        record.source_url ? (
          <a
            href={record.source_url}
            target="_blank"
            rel="noreferrer"
          >
            打开
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      render: (_, record) => {
        const buttonLabel =
          record.push_status === 'failed'
            ? '重试'
            : record.push_status === 'pushed'
              ? '重新推送'
              : '推送';

        return [
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
        subTitle: '把 spider/data 里的本地 JSON 同步到 staging，再单条推送到小程序',
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
          pageSize: 20,
        }}
      />
    </PageContainer>
  );
};

export default TenderPushPage;
