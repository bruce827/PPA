import {
  deleteWeb3dProject,
  getWeb3dProjects,
} from '@/services/web3d';
import { DeleteOutlined, ExportOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { App, Button, Popconfirm, Space, Table, Tag } from 'antd';
import React, { useEffect, useState } from 'react';

const HistoryWeb3D: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<API_WEB3D.Project[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWeb3dProjects();
      setData(res?.data || []);
    } catch (err: any) {
      message.error(err?.message || '加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (record: API_WEB3D.Project) => {
    try {
      await deleteWeb3dProject(record.id);
      message.success('已删除');
      load();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  return (
    <PageContainer
      loading={loading}
      title="Web3D 历史项目"
      extra={
        <Space>
          <Button onClick={load} icon={<ReloadOutlined />}>
            刷新
          </Button>
          <Button type="primary" onClick={() => history.push('/web3d/new')}>
            新建评估
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        dataSource={data}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '名称', dataIndex: 'name' },
          {
            title: '成本(万元)',
            dataIndex: 'final_total_cost',
            render: (v) => Number(v || 0).toFixed(2),
          },
          {
            title: '风险总分',
            dataIndex: 'final_risk_score',
          },
          {
            title: '类型',
            dataIndex: 'project_type',
            render: (v) => <Tag color="blue">{v}</Tag>,
          },
          {
            title: '创建时间',
            dataIndex: 'created_at',
          },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  type="link"
                  onClick={() => history.push(`/web3d/detail/${record.id}`)}
                >
                  详情
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  type="link"
                  onClick={() =>
                    window.open(
                      `/api/web3d/projects/${record.id}/export`,
                      '_blank',
                    )
                  }
                >
                  导出
                </Button>
                <Popconfirm
                  title="确定删除该项目？"
                  onConfirm={() => handleDelete(record)}
                >
                  <Button danger icon={<DeleteOutlined />} type="link">
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
};

export default HistoryWeb3D;
