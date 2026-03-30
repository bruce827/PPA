import {
  deleteProject,
  getProjectList,
  exportProjectToExcel,
} from '@/services/projects';
import BusinessQuoteModal from '@/components/BusinessQuoteModal';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Button, Dropdown, Popconfirm, Tag, Tooltip, App } from 'antd';
import { useRef, useState } from 'react';

const HistoryPage = () => {
  const { message } = App.useApp();
  const actionRef = useRef();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<API.ProjectInfo | null>(
    null,
  );
  const isTemplateValue = (value: any) => {
    const normalized = String(value).toLowerCase();
    return ['1', 'true', 'yes'].includes(normalized);
  };
  const hasBusinessQuote = (value: any) => {
    const normalized = String(value).toLowerCase();
    return ['1', 'true', 'yes'].includes(normalized);
  };
  const getBusinessQuoteTotal = (record: API.ProjectInfo) => {
    if (!record?.business_quote_json) return undefined;
    try {
      const parsed = JSON.parse(record.business_quote_json);
      const pricingMode =
        parsed?.pricing_mode === 'enterprise_product'
          ? 'enterprise_product'
          : 'custom_development';
      const total =
        pricingMode === 'enterprise_product'
          ? (() => {
              const baseCostWan = Number(parsed?.base_cost_wan || 0);
              const variableShareRate =
                Number(parsed?.rates?.cogs_rate || 0) +
                Number(parsed?.rates?.csm_rate || 0);
              return variableShareRate > 0
                ? baseCostWan / (variableShareRate / 100)
                : undefined;
            })()
          : parsed?.amounts?.quote_total_wan;
      return Number.isFinite(Number(total)) ? Number(total) : undefined;
    } catch (_error) {
      return undefined;
    }
  };
  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/assessment/detail/${record.id}`}>{text}</Link>
      ),
      fieldProps: {
        placeholder: '支持模糊搜索',
      },
    },
    {
      valueType: 'select',
      valueEnum: {
        1: { text: '是' },
        0: { text: '否' },
      },
      title: '是否模板',
      dataIndex: 'is_template_filter',
      key: 'is_template_filter',
      hideInTable: true,
      search: {
        transform: (value) => ({ is_template: value }),
      },
    },
    {
      valueType: 'select',
      valueEnum: {
        1: { text: '已生成' },
        0: { text: '未生成' },
      },
      title: '商务报价状态',
      dataIndex: 'has_business_quote_filter',
      key: 'has_business_quote_filter',
      hideInTable: true,
      search: {
        transform: (value) => ({ has_business_quote: value }),
      },
    },
    {
      title: '是否模板',
      dataIndex: 'is_template',
      key: 'is_template',
      width: 100,
      align: 'center',
      hideInSearch: true,
      render: (value) =>
        isTemplateValue(value) ? (
          <Tag color="blue">当前模板</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '商务报价状态',
      dataIndex: 'has_business_quote',
      key: 'has_business_quote',
      width: 120,
      align: 'center',
      hideInSearch: true,
      render: (value) =>
        hasBusinessQuote(value) ? (
          <Tag color="green">已生成</Tag>
        ) : (
          <Tag>未生成</Tag>
        ),
    },
    {
      title: '实施成本 (万元)',
      dataIndex: 'final_total_cost',
      key: 'final_total_cost',
      width: 140,
      valueType: 'money',
      sorter: true,
      align: 'right',
      hideInSearch: true,
    },
    {
      title: '实施成本 (万元)',
      dataIndex: 'final_total_cost_range',
      key: 'final_total_cost_range',
      valueType: 'digitRange',
      hideInTable: true,
      search: {
        transform: (value) => {
          const [min, max] = Array.isArray(value) ? value : [];
          const next: Record<string, any> = {};
          if (typeof min !== 'undefined') next.final_total_cost_min = min;
          if (typeof max !== 'undefined') next.final_total_cost_max = max;
          return next;
        },
      },
    },
    {
      title: '商务报价总计 (万元)',
      dataIndex: 'business_quote_total',
      key: 'business_quote_total',
      width: 160,
      align: 'right',
      hideInSearch: true,
      render: (_, record) => {
        const total = getBusinessQuoteTotal(record);
        return typeof total === 'number' ? total.toFixed(2) : '-';
      },
    },
    {
      title: '风险总分',
      dataIndex: 'final_risk_score',
      key: 'final_risk_score',
      sorter: true,
      align: 'right',
      width: 140,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      valueType: 'dateTime',
      sorter: true,
      align: 'center',
      width: 200,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at_range',
      key: 'created_at_range',
      valueType: 'dateRange',
      hideInTable: true,
      fieldProps: {
        format: 'YYYY-MM-DD',
      },
      search: {
        transform: (value) => {
          const [start, end] = Array.isArray(value) ? value : [];
          const next: Record<string, any> = {};
          if (typeof start !== 'undefined') next.created_at_start = start;
          if (typeof end !== 'undefined') next.created_at_end = end;
          return next;
        },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      align: 'center',
      width: 320,
      render: (text, record, _, action) => [
        <Link key="view" to={`/assessment/detail/${record.id}`}>
          查看
        </Link>,
        <Link key="reassess" to={`/assessment/new?template_id=${record.id}`}>
          重新评估
        </Link>,
        <Dropdown
          key="export"
          menu={{
            items: [
              {
                key: 'internal',
                label: (
                  <a
                    href={exportProjectToExcel(record.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    导出Excel（内部）
                  </a>
                ),
              },
              {
                key: 'external',
                label: (
                  <a
                    href={`${exportProjectToExcel(record.id)}?version=external`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    导出Excel（对外）
                  </a>
                ),
              },
              {
                key: 'business',
                disabled: !hasBusinessQuote(record.has_business_quote),
                label: (
                  <a
                    href={`${exportProjectToExcel(record.id)}?version=business`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => {
                      if (!hasBusinessQuote(record.has_business_quote)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    导出Excel（商务）
                  </a>
                ),
              },
            ],
          }}
        >
          <Button type="link">导出</Button>
        </Dropdown>,
        <Button
          key="business-quote"
          type="link"
          onClick={() => {
            setSelectedProject(record);
            setQuoteModalOpen(true);
          }}
        >
          商务报价
        </Button>,
        isTemplateValue(record.is_template) ? (
          <Tooltip
            key="delete-disabled"
            title="当前模板不可删除，请先在新评估中设置新的模板"
          >
            <Button type="link" disabled>
              删除
            </Button>
          </Tooltip>
        ) : (
          <Popconfirm
            key="delete"
            title="确认删除此项目？"
            onConfirm={async () => {
              await deleteProject(record.id);
              message.success('项目已删除');
              actionRef.current?.reload();
            }}
          >
            <a>删除</a>
          </Popconfirm>
        ),
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        cardBordered
        request={async (params, sorter) => {
          const [sortBy, sortOrderRaw] =
            Object.entries(sorter || {}).find(([, order]) => !!order) || [];
          const sortOrder =
            sortOrderRaw === 'ascend'
              ? 'asc'
              : sortOrderRaw === 'descend'
                ? 'desc'
                : undefined;

          const queryParams = { ...params } as Record<string, any>;
          delete queryParams.current;
          delete queryParams.pageSize;

          const res = await getProjectList({
            params:
              sortBy && sortOrder
                ? {
                    ...queryParams,
                    sort_by: sortBy,
                    sort_order: sortOrder,
                  }
                : queryParams,
          });
          return {
            data: res.data,
            success: true,
          };
        }}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          pageSize: 10,
        }}
        dateFormatter="string"
        headerTitle="历史项目列表"
      />
      <BusinessQuoteModal
        open={quoteModalOpen}
        projectId={selectedProject?.id}
        projectName={selectedProject?.name}
        onCancel={() => {
          setQuoteModalOpen(false);
          setSelectedProject(null);
        }}
        onSuccess={() => {
          setQuoteModalOpen(false);
          setSelectedProject(null);
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default HistoryPage;
