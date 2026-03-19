import {
  createBiddingSite,
  deleteBiddingSite,
  getBiddingSites,
  updateBiddingSite,
  validateBiddingSite,
} from '@/services/opportunity';
import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Form,
  message,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import React, { useMemo, useRef, useState } from 'react';

const sourceLevelOptions = [
  { label: '国家级', value: '国家级' },
  { label: '地方省市', value: '地方省市' },
  { label: '行业垂直', value: '行业垂直' },
  { label: '第三方综合', value: '第三方综合' },
];

const platformTypeOptions = [
  '官方核心',
  '公共资源交易',
  '政府采购',
  '行业核心',
  '电力 / 能源',
  '建筑 / 基建',
  '其他行业',
  '聚合平台',
].map((item) => ({ label: item, value: item }));

const validationStatusMap: Record<
  API_OPPORTUNITY.ValidationStatus,
  { text: string; color: string }
> = {
  never_validated: { text: '未校验', color: 'default' },
  validated_ok: { text: '校验通过', color: 'success' },
  validated_warning: { text: '存在警告', color: 'warning' },
  validated_failed: { text: '校验失败', color: 'error' },
  heuristic_only: { text: '仅启发式', color: 'processing' },
};

const validationStatusOptions = Object.entries(validationStatusMap).map(
  ([value, config]) => ({
    label: config.text,
    value,
  }),
);

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

const BiddingSitesPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [form] = Form.useForm<API_OPPORTUNITY.BiddingSitePayload>();
  const [editingRecord, setEditingRecord] = useState<API_OPPORTUNITY.BiddingSite | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<API_OPPORTUNITY.BiddingSite | null>(null);
  const [validatingId, setValidatingId] = useState<number | null>(null);

  const validationOptions = useMemo(() => validationStatusOptions, []);

  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      is_official: true,
      enabled: true,
    });
    setFormVisible(true);
  };

  const openEditModal = (record: API_OPPORTUNITY.BiddingSite) => {
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.name,
      alias_name: record.alias_name || '',
      url: record.url,
      source_level: record.source_level || undefined,
      province: record.province || '',
      city: record.city || '',
      platform_type: record.platform_type || undefined,
      is_official: record.is_official,
      enabled: record.enabled,
      notes: record.notes || '',
    });
    setFormVisible(true);
  };

  const showValidationDetail = (record: API_OPPORTUNITY.BiddingSite) => {
    setDetailRecord(record);
    setDetailVisible(true);
  };

  const handleSubmit = async (values: API_OPPORTUNITY.BiddingSitePayload) => {
    try {
      if (editingRecord) {
        await updateBiddingSite(editingRecord.id, values);
        message.success('更新成功');
      } else {
        await createBiddingSite(values);
        message.success('创建成功');
      }
      setFormVisible(false);
      actionRef.current?.reload();
      return true;
    } catch (error: any) {
      message.error(error?.message || '保存失败');
      return false;
    }
  };

  const handleValidate = async (record: API_OPPORTUNITY.BiddingSite) => {
    try {
      setValidatingId(record.id);
      const response = await validateBiddingSite(record.id);
      message.success('校验完成');
      if (response?.data?.site) {
        setDetailRecord(response.data.site);
        setDetailVisible(true);
      }
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.message || '校验失败');
    } finally {
      setValidatingId(null);
    }
  };

  const columns: ProColumns<API_OPPORTUNITY.BiddingSite>[] = [
    {
      title: '网站名称',
      dataIndex: 'name',
      width: 240,
      ellipsis: true,
      copyable: true,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.name}</span>
          {record.alias_name ? (
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              别名: {record.alias_name}
            </span>
          ) : null}
        </Space>
      ),
    },
    {
      title: '网址',
      dataIndex: 'url',
      width: 200,
      ellipsis: true,
      copyable: true,
      render: (_, record) => (
        <Tooltip title={record.url}>
          <a
            onClick={() => {
              window.open(record.url, '_blank', 'noopener,noreferrer');
            }}
          >
            {record.url}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '层级',
      dataIndex: 'source_level',
      valueType: 'select',
      width: 100,
      valueEnum: sourceLevelOptions.reduce<Record<string, { text: string }>>(
        (acc, item) => {
          acc[item.value] = { text: item.label };
          return acc;
        },
        {},
      ),
    },
    {
      title: '平台类型',
      dataIndex: 'platform_type',
      valueType: 'select',
      width: 100,
      valueEnum: platformTypeOptions.reduce<Record<string, { text: string }>>(
        (acc, item) => {
          acc[item.value] = { text: item.label };
          return acc;
        },
        {},
      ),
    },
    {
      title: '区域',
      dataIndex: 'province',
      search: false,
      width: 120,
      render: (_, record) => [record.province, record.city].filter(Boolean).join(' / ') || '-',
    },
    {
      title: '官方',
      dataIndex: 'is_official',
      valueType: 'select',
      width: 90,
      valueEnum: {
        true: { text: '是' },
        false: { text: '否' },
      },
      render: (_, record) =>
        record.is_official ? <Badge status="success" text="官方" /> : <Badge status="default" text="第三方" />,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      valueType: 'select',
      width: 90,
      valueEnum: {
        true: { text: '启用' },
        false: { text: '停用' },
      },
      render: (_, record) =>
        record.enabled ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '校验状态',
      dataIndex: 'validation_status',
      valueType: 'select',
      width: 120,
      valueEnum: validationOptions.reduce<Record<string, { text: string }>>(
        (acc, item) => {
          acc[item.value] = { text: item.label };
          return acc;
        },
        {},
      ),
      render: (_, record) => {
        const config = validationStatusMap[record.validation_status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '校验摘要',
      dataIndex: 'validation_summary',
      search: false,
      ellipsis: true,
      render: (_, record) => {
        if (!record.validation_summary) return '-';
        return (
          <Tooltip title={record.validation_summary}>
            <span>{record.validation_summary}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '最近校验',
      dataIndex: 'last_validated_at',
      search: false,
      width: 180,
      ellipsis: true,
      valueType: 'dateTime',
      render: (_, record) =>
        record.last_validated_at ? (
          <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(record.last_validated_at)}</span>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      width: 260,
      render: (_, record) => [
        <a key="validate" onClick={() => handleValidate(record)}>
          {validatingId === record.id ? '校验中...' : 'AI校验'}
        </a>,
        <a
          key="detail"
          onClick={() => {
            showValidationDetail(record);
          }}
        >
          查看结果
        </a>,
        <a key="edit" onClick={() => openEditModal(record)}>
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确认删除该网站吗？"
          onConfirm={async () => {
            try {
              await deleteBiddingSite(record.id);
              message.success('删除成功');
              actionRef.current?.reload();
            } catch (error: any) {
              message.error(error?.message || '删除失败');
            }
          }}
        >
          <a>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<API_OPPORTUNITY.BiddingSite>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        cardBordered
        request={async (params) => {
          const response = await getBiddingSites(params);
          return {
            data: response?.data?.items || [],
            success: response?.success ?? true,
            total: response?.data?.total || 0,
          };
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
        }}
        search={{
          labelWidth: 'auto',
        }}
        headerTitle="招标网站"
        toolBarRender={() => [
          <Button key="new" type="primary" onClick={openCreateModal}>
            新建网站
          </Button>,
        ]}
      />

      <ModalForm<API_OPPORTUNITY.BiddingSitePayload>
        title={editingRecord ? '编辑招标网站' : '新建招标网站'}
        open={formVisible}
        form={form}
        onOpenChange={setFormVisible}
        modalProps={{
          destroyOnHidden: true,
        }}
        width={640}
        onFinish={handleSubmit}
      >
        <ProFormText
          name="name"
          label="网站名称"
          placeholder="请输入网站名称"
          rules={[{ required: true, message: '请输入网站名称' }]}
        />
        <ProFormText
          name="alias_name"
          label="别名"
          placeholder="可选，多个别名可使用 / 分隔"
        />
        <ProFormText
          name="url"
          label="网址"
          placeholder="必须以 http:// 或 https:// 开头"
          rules={[
            { required: true, message: '请输入网址' },
            {
              pattern: /^https?:\/\//i,
              message: '网址必须以 http:// 或 https:// 开头',
            },
          ]}
        />
        <ProFormSelect
          name="source_level"
          label="层级"
          options={sourceLevelOptions}
          allowClear
        />
        <ProFormSelect
          name="platform_type"
          label="平台类型"
          options={platformTypeOptions}
          allowClear
        />
        <ProFormText name="province" label="省份" placeholder="如：北京、广东、全国" />
        <ProFormText name="city" label="城市" placeholder="如：北京、深圳、全国" />
        <ProFormSwitch name="is_official" label="是否官方" />
        <ProFormSwitch name="enabled" label="是否启用" />
        <ProFormTextArea
          name="notes"
          label="备注"
          placeholder="补充说明、站点覆盖范围、使用建议等"
          fieldProps={{ rows: 4 }}
        />
      </ModalForm>

      <Modal
        title={detailRecord ? `校验结果 - ${detailRecord.name}` : '校验结果'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={720}
      >
        {detailRecord ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={validationStatusMap[detailRecord.validation_status].color}>
                {validationStatusMap[detailRecord.validation_status].text}
              </Tag>
              <Tag color={detailRecord.enabled ? 'green' : 'default'}>
                {detailRecord.enabled ? '启用' : '停用'}
              </Tag>
              <Tag color={detailRecord.is_official ? 'blue' : 'default'}>
                {detailRecord.is_official ? '官方' : '第三方'}
              </Tag>
            </Space>

            <div>
              <strong>网址：</strong>
              <a
                style={{ marginLeft: 8 }}
                onClick={() => window.open(detailRecord.url, '_blank', 'noopener,noreferrer')}
              >
                {detailRecord.url}
              </a>
            </div>

            <div>
              <strong>摘要：</strong>
              <div style={{ marginTop: 8 }}>
                {detailRecord.validation_summary || '暂无校验摘要'}
              </div>
            </div>

            <div>
              <strong>结构化结果：</strong>
              <pre
                style={{
                  marginTop: 8,
                  maxHeight: 360,
                  overflow: 'auto',
                  padding: 12,
                  background: '#fafafa',
                  borderRadius: 6,
                }}
              >
                {JSON.stringify(
                  {
                    auth_required: detailRecord.auth_required,
                    is_bidding_site: detailRecord.is_bidding_site,
                    http_status: detailRecord.http_status,
                    final_url: detailRecord.final_url,
                    validation_confidence: detailRecord.validation_confidence,
                    last_validated_at: formatDateTime(detailRecord.last_validated_at),
                    redirect_chain: detailRecord.redirect_chain || [],
                    validation_payload: detailRecord.validation_payload || null,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </Space>
        ) : null}
      </Modal>
    </PageContainer>
  );
};

export default BiddingSitesPage;
