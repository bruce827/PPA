import type { PromptTemplate } from '@/services/promptTemplate';
import {
  copyPromptTemplate,
  deletePromptTemplate,
  getPromptTemplates,
} from '@/services/promptTemplate';
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { history, useLocation } from '@umijs/max';
import { Button, Popconfirm, Tag, message } from 'antd';
import React, { useEffect, useRef } from 'react';

const PromptTemplateListPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.refresh) {
      actionRef.current?.reload();
    }
  }, [location.state]);

  const columns: ProColumns<PromptTemplate>[] = [
    {
      title: '模板名称',
      dataIndex: 'template_name',
      width: '25%',
      sorter: true,
      render: (_, record) => (
        <a
          onClick={() =>
            history.push(`/model-config/prompts/${record.id}/edit`)
          }
        >
          {record.template_name}
        </a>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: '15%',
      filters: true,
      onFilter: true,
      valueEnum: {
        risk_analysis: { text: '风险分析' },
        cost_estimation: { text: '成本估算' },
        module_analysis: { text: '模块梳理' },
        report_generation: { text: '报告生成' },
        custom: { text: '自定义' },
      },
    },
    {
      title: '类型',
      dataIndex: 'is_system',
      width: '10%',
      render: (_, record) => (
        <Tag color={record.is_system ? 'blue' : 'green'}>
          {record.is_system ? '系统' : '用户'}
        </Tag>
      ),
    },
    {
      title: '变量数',
      dataIndex: 'variable_count',
      width: '8%',
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: '10%',
      render: (_, record) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: '17%',
      sorter: true,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: '15%',
      render: (text, record, _, action) => [
        <a
          key="view"
          onClick={() =>
            history.push(`/model-config/prompts/${record.id}/edit`)
          }
        >
          {record.is_system ? '查看' : '编辑'}
        </a>,
        <a
          key="copy"
          onClick={async () => {
            const newTemplate = await copyPromptTemplate(record.id);
            message.success('复制成功');
            history.push(`/model-config/prompts/${newTemplate.id}/edit`);
          }}
        >
          复制
        </a>,
        <Popconfirm
          key="delete"
          title={`确定删除 "${record.template_name}"?`}
          onConfirm={async () => {
            await deletePromptTemplate(record.id);
            message.success('删除成功');
            actionRef.current?.reload();
          }}
          disabled={record.is_system}
        >
          <a style={{ color: record.is_system ? 'grey' : 'red' }}>
            删除
          </a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <ProTable<PromptTemplate>
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async (params = {}) => {
        const result = await getPromptTemplates(params);
        // ProTable expects a specific object structure, but the API returns an array.
        // We need to wrap the array into the format that ProTable understands.
        if (Array.isArray(result)) {
          return {
            data: result,
            success: true,
            total: result.length,
          };
        }
        // Handle cases where the API might return the object structure directly in the future.
        return {
          data: result.data || [],
          success: result.success !== false,
          total: result.total || 0,
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
      headerTitle="提示词模板列表"
      toolBarRender={() => [
        <Button
          key="button"
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => history.push('/model-config/prompts/create')}
        >
          新建模板
        </Button>,
      ]}
    />
  );
};

export default PromptTemplateListPage;
