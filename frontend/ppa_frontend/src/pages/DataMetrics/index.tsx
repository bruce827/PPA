import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import ProTable from '@ant-design/pro-table';
import type { ProColumns } from '@ant-design/pro-table';

import {
  getDataMetricsProjects,
  createDataMetricsProject,
  deleteDataMetricsProject,
  getLinkedProjects,
  getDataMetrics,
  createDataMetric,
  updateDataMetric,
  deleteDataMetric,
  batchDataMetrics,
  exportDataMetrics,
  type DataMetricsProject,
  type DataMetric,
  type LinkedProject,
} from '@/services/dataMetrics';
import { DISPLAY_TYPE_OPTIONS, DISPLAY_TYPE_COLORS, COLLECTION_CYCLE_OPTIONS, DEFAULT_DISPLAY_TYPE } from './constants';
import ImportModal from './ImportModal';

const DataMetrics: React.FC = () => {
  // 项目相关状态
  const [projects, setProjects] = useState<DataMetricsProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [historyProjects, setHistoryProjects] = useState<LinkedProject[]>([]);
  const [createProjectVisible, setCreateProjectVisible] = useState(false);
  const [createProjectForm] = Form.useForm();

  // 指标相关状态
  const [metrics, setMetrics] = useState<DataMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [importVisible, setImportVisible] = useState(false);

  // 行内编辑状态
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<Partial<DataMetric>>({});
  const [saving, setSaving] = useState(false);

  // ========== 数据加载 ==========

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDataMetricsProjects();
      if (res.success) {
        setProjects(res.data);
        if (res.data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(res.data[0].id);
        }
      }
    } catch (error) {
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  // 加载历史项目
  const loadHistoryProjects = useCallback(async () => {
    try {
      const res = await getLinkedProjects();
      if (res.success) {
        setHistoryProjects(res.data);
      }
    } catch (error) {
      console.error('加载历史项目失败', error);
    }
  }, []);

  // 加载指标列表
  const loadMetrics = useCallback(async (projectId: number) => {
    setLoadingMetrics(true);
    try {
      const res = await getDataMetrics({
        dm_project_id: projectId,
        page: 1,
        pageSize: 1000, // 一次性加载所有
      });
      if (res.success) {
        setMetrics(res.data.items);
      }
    } catch (error) {
      message.error('加载指标列表失败');
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadProjects();
    loadHistoryProjects();
  }, [loadProjects, loadHistoryProjects]);

  // 项目选择变化
  useEffect(() => {
    if (selectedProjectId) {
      loadMetrics(selectedProjectId);
    }
  }, [selectedProjectId, loadMetrics]);

  // ========== 项目操作 ==========

  // 创建项目
  const handleCreateProject = async (values: any) => {
    try {
      const res = await createDataMetricsProject(values);
      if (res.success) {
        message.success('创建成功');
        setCreateProjectVisible(false);
        createProjectForm.resetFields();
        loadProjects();
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 关联历史项目
  const handleLinkHistoryProject = (projectId: number) => {
    const project = historyProjects.find((p) => p.id === projectId);
    if (project) {
      createProjectForm.setFieldsValue({
        project_name: project.name,
        linked_project_id: project.id,
      });
    }
  };

  // 删除项目
  const handleDeleteProject = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除项目将同时删除其下的所有数据指标，确定要删除吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteDataMetricsProject(id);
          message.success('删除成功');
          setSelectedProjectId(undefined);
          loadProjects();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // ========== 指标操作 ==========

  // 新增指标
  const handleAddMetric = async () => {
    if (!selectedProjectId) {
      message.warning('请先选择项目');
      return;
    }

    const newMetric = {
      dm_project_id: selectedProjectId,
      module_name: '',
      scene_l1: '',
      scene_l2: '',
      metric_name: '',
      display_type: DEFAULT_DISPLAY_TYPE,
    };

    try {
      const res = await createDataMetric(newMetric);
      if (res.success) {
        message.success('新增成功');
        loadMetrics(selectedProjectId);
        // 开始编辑新记录
        setEditingId(res.data.id);
        setEditingRecord(res.data);
      }
    } catch (error) {
      message.error('新增失败');
    }
  };

  // 删除指标
  const handleDeleteMetric = async (id: number) => {
    try {
      await deleteDataMetric(id);
      message.success('删除成功');
      if (selectedProjectId) {
        loadMetrics(selectedProjectId);
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的数据');
      return;
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条数据吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await batchDataMetrics('delete', selectedRowKeys);
          message.success('删除成功');
          setSelectedRowKeys([]);
          if (selectedProjectId) {
            loadMetrics(selectedProjectId);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 导出Excel
  const handleExport = async () => {
    if (!selectedProjectId) {
      message.warning('请先选择项目');
      return;
    }
    try {
      const blob = await exportDataMetrics({ dm_project_id: selectedProjectId });
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `数据指标清单_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error.message || '导出失败');
    }
  };

  // ========== 行内编辑 ==========

  // 开始编辑
  const handleStartEdit = (record: DataMetric) => {
    setEditingId(record.id);
    setEditingRecord({ ...record });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRecord({});
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingId || saving) return;

    setSaving(true);
    try {
      await updateDataMetric(editingId, editingRecord);
      message.success('保存成功');
      setEditingId(null);
      setEditingRecord({});
      if (selectedProjectId) {
        loadMetrics(selectedProjectId);
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 编辑字段变化
  const handleEditChange = (field: string, value: any) => {
    setEditingRecord((prev) => ({ ...prev, [field]: value }));
  };

  // ========== 表格列定义 ==========

  const columns: ProColumns<DataMetric>[] = [
    {
      title: '功能模块',
      dataIndex: 'module_name',
      width: 120,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.module_name}
              onChange={(e) => handleEditChange('module_name', e.target.value)}
              size="small"
              placeholder="如：产销动态"
            />
          );
        }
        return record.module_name;
      },
    },
    {
      title: '一级场景',
      dataIndex: 'scene_l1',
      width: 120,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.scene_l1}
              onChange={(e) => handleEditChange('scene_l1', e.target.value)}
              size="small"
              placeholder="如：油气产量"
            />
          );
        }
        return record.scene_l1;
      },
    },
    {
      title: '二级场景',
      dataIndex: 'scene_l2',
      width: 120,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.scene_l2}
              onChange={(e) => handleEditChange('scene_l2', e.target.value)}
              size="small"
              placeholder="如：原油产量"
            />
          );
        }
        return record.scene_l2;
      },
    },
    {
      title: '指标/数据项',
      dataIndex: 'metric_name',
      width: 150,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.metric_name}
              onChange={(e) => handleEditChange('metric_name', e.target.value)}
              size="small"
              placeholder="如：日完成"
            />
          );
        }
        return record.metric_name;
      },
    },
    {
      title: '展示方式',
      dataIndex: 'display_type',
      width: 100,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Select
              value={editingRecord.display_type}
              onChange={(val) => handleEditChange('display_type', val)}
              size="small"
              style={{ width: '100%' }}
            >
              {DISPLAY_TYPE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        const color = DISPLAY_TYPE_COLORS[record.display_type] || 'default';
        return <Tag color={color}>{record.display_type}</Tag>;
      },
    },
    {
      title: '取数逻辑',
      dataIndex: 'data_source_logic',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.data_source_logic}
              onChange={(e) => handleEditChange('data_source_logic', e.target.value)}
              size="small"
              placeholder="接口调用、计算等"
            />
          );
        }
        return record.data_source_logic;
      },
    },
    {
      title: '算法',
      dataIndex: 'algorithm',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.algorithm}
              onChange={(e) => handleEditChange('algorithm', e.target.value)}
              size="small"
              placeholder="计算公式"
            />
          );
        }
        return record.algorithm;
      },
    },
    {
      title: '采集周期',
      dataIndex: 'collection_cycle',
      width: 80,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Select
              value={editingRecord.collection_cycle}
              onChange={(val) => handleEditChange('collection_cycle', val)}
              size="small"
              style={{ width: '100%' }}
              allowClear
              placeholder="选择"
            >
              {COLLECTION_CYCLE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.collection_cycle;
      },
    },
    {
      title: '数据来源系统',
      dataIndex: 'source_system',
      width: 150,
      ellipsis: true,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.source_system}
              onChange={(e) => handleEditChange('source_system', e.target.value)}
              size="small"
              placeholder="来源系统名称"
            />
          );
        }
        return record.source_system;
      },
    },
    {
      title: '数据来源功能模块',
      dataIndex: 'source_module',
      width: 150,
      ellipsis: true,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.source_module}
              onChange={(e) => handleEditChange('source_module', e.target.value)}
              size="small"
              placeholder="功能模块路径"
            />
          );
        }
        return record.source_module;
      },
    },
    {
      title: '对接方式',
      dataIndex: 'integration_method',
      width: 100,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.integration_method}
              onChange={(e) => handleEditChange('integration_method', e.target.value)}
              size="small"
              placeholder="如：数据中台"
            />
          );
        }
        return record.integration_method;
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 150,
      ellipsis: true,
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Input
              value={editingRecord.remark}
              onChange={(e) => handleEditChange('remark', e.target.value)}
              size="small"
              placeholder="补充说明"
            />
          );
        }
        return record.remark;
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        if (editingId === record.id) {
          return [
            <Tooltip title="保存" key="save">
              <Button
                type="link"
                size="small"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveEdit}
              />
            </Tooltip>,
            <Tooltip title="取消" key="cancel">
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
              />
            </Tooltip>,
          ];
        }
        return [
          <Tooltip title="编辑" key="edit">
            <Button
              type="link"
              size="small"
              onClick={() => handleStartEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>,
          <Tooltip title="删除" key="delete">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteMetric(record.id)}
            />
          </Tooltip>,
        ];
      },
    },
  ];

  // ========== 渲染 ==========

  return (
    <PageContainer
      header={{
        title: '数据指标设计',
        breadcrumb: {
          items: [
            { title: '项目详细设计' },
            { title: '数据指标设计' },
          ],
        },
      }}
    >
      <Card>
        {/* 顶部：项目选择 + 操作按钮 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <span>选择项目：</span>
            <Select
              style={{ width: 300 }}
              placeholder="请选择项目"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              loading={loading}
            >
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.project_name} ({p.metric_count} 个指标)
                </Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadProjects}>
              刷新
            </Button>
          </Space>
          <Space>
            <Button
              icon={<ImportOutlined />}
              onClick={() => {
                if (!selectedProjectId) {
                  message.warning('请先选择项目');
                  return;
                }
                setImportVisible(true);
              }}
            >
              Excel导入
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              Excel导出
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateProjectVisible(true)}
            >
              新建项目
            </Button>
            {selectedProjectId && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteProject(selectedProjectId)}
              >
                删除项目
              </Button>
            )}
          </Space>
        </div>

        {/* 指标表格 */}
        {selectedProjectId && (
          <ProTable<DataMetric>
            headerTitle="数据指标列表"
            columns={columns}
            dataSource={metrics}
            rowKey="id"
            loading={loadingMetrics}
            search={false}
            options={false}
            pagination={false}
            scroll={{ x: 1800 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as number[]),
            }}
            toolBarRender={() => [
              <Button
                key="add"
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddMetric}
              >
                新增指标
              </Button>,
              selectedRowKeys.length > 0 && (
                <Button
                  key="batchDelete"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              ),
            ]}
          />
        )}

        {!selectedProjectId && !loading && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>暂无数据，请先选择或创建项目</p>
          </div>
        )}
      </Card>

      {/* 新建项目弹窗 */}
      <Modal
        title="新建项目"
        open={createProjectVisible}
        onCancel={() => {
          setCreateProjectVisible(false);
          createProjectForm.resetFields();
        }}
        footer={null}
      >
        <Form form={createProjectForm} onFinish={handleCreateProject} layout="vertical">
          <Form.Item
            name="project_name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item name="project_desc" label="项目描述">
            <Input.TextArea placeholder="请输入项目描述" rows={3} />
          </Form.Item>
          <Form.Item name="linked_project_id" label="关联历史项目">
            <Select
              placeholder="可选择关联的历史项目"
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={handleLinkHistoryProject}
            >
              {historyProjects.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => {
                setCreateProjectVisible(false);
                createProjectForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Excel导入弹窗 */}
      <ImportModal
        visible={importVisible}
        dmProjectId={selectedProjectId!}
        onClose={() => setImportVisible(false)}
        onSuccess={() => {
          setImportVisible(false);
          if (selectedProjectId) {
            loadMetrics(selectedProjectId);
          }
        }}
      />
    </PageContainer>
  );
};

export default DataMetrics;
