import { AI_PROVIDER_VALUE_ENUM } from '@/constants';
import { deleteAIModel, getAIModels, setCurrentModel, testAIModel } from '@/services/aiModel';
import {
  PlusOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { useRef, useState } from 'react';
import ModelForm from './components/ModelForm';

const AIModelApplication: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<
    API.AIModelConfig | undefined
  >();
  const [currentModelId, setCurrentModelId] = useState<number | undefined>(
    undefined,
  );
  const actionRef = useRef<ActionType>();

  const handleDelete = async (id: number) => {
    try {
      const response = await deleteAIModel(id);
      if (response.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleTest = async (id: number, configName: string) => {
    const hide = message.loading(`正在测试 ${configName}...`, 0);
    try {
      const response = await testAIModel(id);
      hide();
      if (response.success) {
        message.success(response.message || '测试成功');
        actionRef.current?.reload();
      } else {
        message.error(response.message || '测试失败');
      }
    } catch (error: any) {
      hide();
      message.error(error.message || '测试失败');
    }
  };

  const handleSetCurrent = async (id: number, configName: string) => {
    try {
      const response = await setCurrentModel(id);
      if (response.success) {
        message.success(response.message || `已将 ${configName} 设为当前模型`);
        actionRef.current?.reload();
      } else {
        message.error(response.message || '设置失败');
      }
    } catch (error: any) {
      message.error(error.message || '设置失败');
    }
  };

  const columns: ProColumns<API.AIModelConfig>[] = [
    {
      title: '配置名称',
      dataIndex: 'config_name',
      sorter: true,
      render: (_, record) => (
        <>
          {record.is_current === 1 && (
            <span style={{ color: '#faad14', marginRight: 4 }}>⭐</span>
          )}
          {record.config_name}
        </>
      ),
    },
    {
      title: '服务商',
      dataIndex: 'provider',
      sorter: true,
      filters: true,
      valueEnum: AI_PROVIDER_VALUE_ENUM,
    },
    {
      title: '模型',
      dataIndex: 'model_name',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      render: (_, record) => {
        const tags = [];

        // 当前使用标识（绿色 Tag）
        if (record.is_current === 1) {
          tags.push(
            <Tag key="current" color="green">
              当前使用
            </Tag>,
          );
        }

        // 启用/禁用状态
        tags.push(
          <Tag key="active" color={record.is_active === 1 ? 'blue' : 'default'}>
            {record.is_active === 1 ? '启用' : '禁用'}
          </Tag>,
        );

        // 测试状态
        if (record.test_status === 'success') {
          tags.push(
            <Tag key="test" color="success">
              测试通过
            </Tag>,
          );
        } else if (record.test_status === 'failed') {
          tags.push(
            <Tag key="test" color="error">
              测试失败
            </Tag>,
          );
        }

        return <>{tags}</>;
      },
    },
    {
      title: '最后测试',
      dataIndex: 'last_test_time',
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => {
        const actions = [];

        // 设为当前按钮（当前模型禁用）
        if (record.is_current === 1) {
          actions.push(
            <span
              key="current"
              style={{ color: '#999', cursor: 'not-allowed' }}
            >
              <StarOutlined /> 当前模型
            </span>,
          );
        } else {
          actions.push(
            <Popconfirm
              key="set-current"
              title={`切换当前模型为 ${record.config_name}？`}
              description="将使用此模型配置进行 AI 功能调用。"
              onConfirm={() => handleSetCurrent(record.id, record.config_name)}
              okText="确定"
              cancelText="取消"
            >
              <a>
                <StarOutlined /> 设为当前
              </a>
            </Popconfirm>,
          );
        }

        // 测试按钮
        actions.push(
          <a
            key="test"
            onClick={() => handleTest(record.id, record.config_name)}
          >
            <ThunderboltOutlined /> 测试
          </a>,
        );

        // 编辑按钮
        actions.push(
          <a
            key="edit"
            onClick={() => {
              setCurrentRecord(record);
              setModalVisible(true);
            }}
          >
            编辑
          </a>,
        );

        // 删除按钮（当前模型禁用）
        if (record.is_current === 1) {
          actions.push(
            <span key="delete" style={{ color: '#999', cursor: 'not-allowed' }}>
              删除
            </span>,
          );
        } else {
          actions.push(
            <Popconfirm
              key="delete"
              title={`确定删除 ${record.config_name}？`}
              description="删除后无法恢复。"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <a style={{ color: 'red' }}>删除</a>
            </Popconfirm>,
          );
        }

        return actions;
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<API.AIModelConfig>
        headerTitle="AI 模型配置列表"
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <Button
            key="button"
            icon={<PlusOutlined />}
            onClick={() => {
              setCurrentRecord(undefined);
              setModalVisible(true);
            }}
            type="primary"
          >
            新建模型配置
          </Button>,
        ]}
        request={async (params, sort) => {
          try {
            const response = await getAIModels();
            if (response.success) {
              const current = (response.data || []).find(
                (item) => item.is_current === 1,
              );
              setCurrentModelId(current?.id);
              return {
                data: response.data || [],
                success: true,
              };
            }
            return {
              data: [],
              success: false,
            };
          } catch (error) {
            return {
              data: [],
              success: false,
            };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
      />
      <ModelForm
        visible={modalVisible}
        record={currentRecord}
        currentModelId={currentModelId}
        onCancel={() => {
          setModalVisible(false);
          setCurrentRecord(undefined);
        }}
        onSuccess={() => {
          setModalVisible(false);
          setCurrentRecord(undefined);
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default AIModelApplication;
