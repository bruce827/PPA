import type { PromptVariable } from '@/services/promptTemplate';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Tooltip, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

interface VariableListProps {
  variables: PromptVariable[];
  onAdd: () => void;
  onEdit: (variable: PromptVariable, index: number) => void;
  onDelete: (index: number) => void;
  disabled?: boolean;
}

const VariableList: React.FC<VariableListProps> = ({
  variables,
  onAdd,
  onEdit,
  onDelete,
  disabled = false,
}) => {
  const columns = [
    {
      title: '变量名',
      dataIndex: 'name',
      key: 'name',
      width: 420,
      render: (text: string) => {
        const value = `{{${text}}}`;
        return (
          <Tooltip title={value} placement="topLeft">
            <Text
              code
              style={{
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
              }}
            >
              {value}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      width: 240,
      ellipsis: { showTitle: false } as any,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 80,
      align: 'center' as const,
      render: (required: boolean) => (required ? '✓' : ''),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: PromptVariable, index: number) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record, index)}
            disabled={disabled}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此变量？"
            onConfirm={() => onDelete(index)}
            disabled={disabled}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={disabled}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={onAdd}
          disabled={disabled}
          block
        >
          添加变量
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={variables}
        rowKey="name"
        pagination={false}
        size="small"
        tableLayout="fixed"
        locale={{
          emptyText: '暂无变量，点击上方按钮添加',
        }}
      />
    </div>
  );
};

export default VariableList;
