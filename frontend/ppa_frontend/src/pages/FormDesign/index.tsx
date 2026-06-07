import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import React, { useCallback, useEffect, useState } from 'react';
import ProTable from '@ant-design/pro-table';
import type { ProColumns } from '@ant-design/pro-table';
import ProForm, {
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-form';
import {
  createForm,
  createFormDesignProject,
  deleteField,
  deleteForm,
  deleteFormDesignProject,
  getAppsByProjectId,
  getFieldsByFormId,
  getFormDesignProjects,
  getFormsByAppId,
  getProjects,
  updateField,
  validateField,
  validateForm,
} from '@/services/formDesign';
import {
  FIELD_TYPE_OPTIONS,
  INPUT_TYPE_OPTIONS,
  CARD_WIDTH_OPTIONS,
  CONTROL_OPTIONS,
  YES_NO_OPTIONS,
} from './constants';

// 类型定义
interface FormProject {
  id: number;
  project_name: string;
  project_desc: string;
  linked_project_id: number | null;
  app_count: number;
  form_count: number;
}

interface FormApp {
  id: number;
  app_name: string;
  app_code: string;
  project_id: number;
  form_count: number;
}

interface FormDefinition {
  id: number;
  app_id: number;
  form_name: string;
  form_code: string;
  filter_condition: string;
  description: string;
}

interface FormField {
  id: number;
  form_id: number;
  field_name: string;
  field_code: string;
  is_primary_key: number;
  is_virtual: number;
  field_type: string;
  field_length: number;
  field_precision: number;
  default_value: string;
  input_type: string;
  input_type_code: string;
  input_component: string;
  input_params: string;
  is_required: number;
  is_unique: number;
  placeholder: string;
  remark: string;
  card_group: string;
  card_sort: number;
  card_width: string;
  card_width_span: number;
  add_control: string;
  update_control: string;
  detail_control: string;
  list_width: number;
  list_control: string;
  list_sort: number;
  list_formatter: string;
  is_filter: number;
  filter_mode: string;
  filter_default: string;
  filter_placeholder: string;
  source_system: string;
}

// 组件
const FormDesign: React.FC = () => {
  // 状态
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<FormProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [apps, setApps] = useState<FormApp[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | undefined>();
  const [fields, setFields] = useState<FormField[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<Partial<FormField>>({});
  const [createProjectVisible, setCreateProjectVisible] = useState(false);
  const [createFormVisible, setCreateFormVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewField, setPreviewField] = useState<FormField | null>(null);
  const [historyProjects, setHistoryProjects] = useState<any[]>([]);

  // 表单实例
  const [createProjectForm] = Form.useForm();
  const [createFormForm] = Form.useForm();

  // 加载设计项目列表
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFormDesignProjects();
      if (res.code === 200) {
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

  // 加载应用列表
  const loadApps = useCallback(async (projectId: number) => {
    try {
      const res = await getAppsByProjectId(projectId);
      if (res.code === 200) {
        setApps(res.data);
      }
    } catch (error) {
      message.error('加载应用列表失败');
    }
  }, []);

  // 加载表单列表
  const loadForms = useCallback(async (appId: number) => {
    try {
      const res = await getFormsByAppId(appId);
      if (res.code === 200) {
        setForms(res.data);
        if (res.data.length > 0 && !selectedFormId) {
          setSelectedFormId(res.data[0].id);
        }
      }
    } catch (error) {
      message.error('加载表单列表失败');
    }
  }, [selectedFormId]);

  // 加载字段列表
  const loadFields = useCallback(async (formId: number) => {
    setLoading(true);
    try {
      const res = await getFieldsByFormId(formId);
      if (res.code === 200) {
        setFields(res.data);
      }
    } catch (error) {
      message.error('加载字段列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载历史项目
  const loadHistoryProjects = useCallback(async () => {
    try {
      const res = await getProjects();
      if (res.data) {
        setHistoryProjects(res.data);
      }
    } catch (error) {
      console.error('加载历史项目失败', error);
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
      loadApps(selectedProjectId);
    }
  }, [selectedProjectId, loadApps]);

  // 应用加载后，选择第一个
  useEffect(() => {
    if (apps.length > 0) {
      loadForms(apps[0].id);
    }
  }, [apps, loadForms]);

  // 表单选择变化
  useEffect(() => {
    if (selectedFormId) {
      loadFields(selectedFormId);
    }
  }, [selectedFormId, loadFields]);

  // 创建项目
  const handleCreateProject = async (values: any) => {
    try {
      const res = await createFormDesignProject(values);
      if (res.code === 200) {
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
        project_name: project.name || project.project_name,
        project_desc: project.description || project.project_desc,
        linked_project_id: project.id,
      });
    }
  };

  // 删除项目
  const handleDeleteProject = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除项目将同时删除其下的所有应用、表单和字段，确定要删除吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteFormDesignProject(id);
          message.success('删除成功');
          loadProjects();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 创建表单
  const handleCreateForm = async (values: any) => {
    if (!apps.length) {
      message.error('请先创建应用');
      return;
    }
    try {
      const res = await createForm({
        ...values,
        app_id: apps[0].id,
      });
      if (res.code === 200) {
        message.success('创建成功');
        setCreateFormVisible(false);
        createFormForm.resetFields();
        if (selectedProjectId) {
          loadForms(apps[0].id);
        }
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 删除表单
  const handleDeleteForm = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除表单将同时删除其下的所有字段，确定要删除吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteForm(id);
          message.success('删除成功');
          if (apps.length > 0) {
            loadForms(apps[0].id);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 开始编辑字段
  const handleStartEdit = (record: FormField) => {
    setEditingFieldId(record.id);
    setEditingField({ ...record });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditingField({});
  };

  // 保存字段
  const handleSaveField = async () => {
    if (!editingFieldId) return;

    // 先调用校验接口
    try {
      const validateRes = await validateField(editingField);
      if (validateRes.code === 200) {
        const { errors, warnings } = validateRes.data;

        // 显示警告
        if (warnings.length > 0) {
          message.warning(`警告：${warnings.join('；')}`, 5);
        }

        // 如果有错误，阻止保存
        if (errors.length > 0) {
          Modal.error({
            title: '数据校验失败',
            content: (
              <div>
                <p>以下校验规则未通过：</p>
                <ul>
                  {errors.map((err: string, index: number) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            ),
          });
          return;
        }
      }
    } catch (error) {
      console.error('校验接口调用失败', error);
    }

    // 校验通过，保存数据
    try {
      const res = await updateField(editingFieldId, editingField);
      if (res.code === 200) {
        message.success('保存成功');
        setEditingFieldId(null);
        setEditingField({});
        if (selectedFormId) {
          loadFields(selectedFormId);
        }
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 编辑字段值变化
  const handleEditChange = (key: string, value: any) => {
    setEditingField((prev) => ({ ...prev, [key]: value }));
  };

  // 删除字段
  const handleDeleteField = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个字段吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteField(id);
          message.success('删除成功');
          if (selectedFormId) {
            loadFields(selectedFormId);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 预览表单
  const handlePreview = (field: FormField) => {
    setPreviewField(field);
    setPreviewVisible(true);
  };

  // 渲染表单控件
  const renderFormControl = (field: FormField) => {
    const component = field.input_component;
    const required = field.is_required === 1;
    const disabled =
      field.add_control === '隐藏' ||
      field.update_control === '隐藏' ||
      field.detail_control === '隐藏';

    const commonProps = {
      name: field.field_code,
      label: field.field_name,
      placeholder: field.placeholder || `请输入${field.field_name}`,
      rules: required ? [{ required: true, message: `请输入${field.field_name}` }] : [],
      disabled,
    };

    // 安全解析 input_params
    let parsedParams: any = null;
    if (field.input_params) {
      try {
        parsedParams = JSON.parse(field.input_params);
      } catch (e) {
        console.warn('input_params 解析失败:', field.input_params, e);
      }
    }

    switch (component) {
      case 'Input':
        return <ProFormText {...commonProps} />;
      case 'Input.TextArea':
        return <ProFormTextArea {...commonProps} />;
      case 'InputNumber':
        return <ProFormDigit {...commonProps} />;
      case 'Select':
        return (
          <ProFormSelect
            {...commonProps}
            options={parsedParams?.options || []}
          />
        );
      case 'DatePicker':
        return <ProFormDatePicker {...commonProps} />;
      case 'TimePicker':
        return <ProFormDatePicker.TimePicker {...commonProps} />;
      case 'Switch':
        return <ProFormSwitch {...commonProps} />;
      default:
        return <ProFormText {...commonProps} />;
    }
  };

  // 表格列定义
  const columns: ProColumns<FormField>[] = [
    {
      title: '字段名称',
      dataIndex: 'field_name',
      width: 150,
      fixed: 'left',
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Input
              value={editingField.field_name}
              onChange={(e) => handleEditChange('field_name', e.target.value)}
              size="small"
            />
          );
        }
        return record.field_name;
      },
    },
    {
      title: '字段编码',
      dataIndex: 'field_code',
      width: 150,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Input
              value={editingField.field_code}
              onChange={(e) => handleEditChange('field_code', e.target.value)}
              size="small"
            />
          );
        }
        return record.field_code;
      },
    },
    {
      title: '字段类型',
      dataIndex: 'field_type',
      width: 100,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Select
              value={editingField.field_type}
              onChange={(val) => handleEditChange('field_type', val)}
              size="small"
              style={{ width: '100%' }}
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.field_type;
      },
    },
    {
      title: '输入类型',
      dataIndex: 'input_type',
      width: 120,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Select
              value={editingField.input_type}
              onChange={(val) => {
                handleEditChange('input_type', val);
                // 自动更新 input_type_code 和 input_component
                const option = INPUT_TYPE_OPTIONS.find((item) => item.value === val);
                if (option) {
                  handleEditChange('input_type_code', option.code);
                  handleEditChange('input_component', option.component);
                }
              }}
              size="small"
              style={{ width: '100%' }}
            >
              {INPUT_TYPE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.input_type;
      },
    },
    {
      title: '控件',
      dataIndex: 'input_component',
      width: 120,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return editingField.input_component || record.input_component;
        }
        return record.input_component;
      },
    },
    {
      title: '卡片分组',
      dataIndex: 'card_group',
      width: 120,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Input
              value={editingField.card_group}
              onChange={(e) => handleEditChange('card_group', e.target.value)}
              size="small"
              placeholder="如：基本信息"
            />
          );
        }
        return record.card_group;
      },
    },
    {
      title: '卡片宽度',
      dataIndex: 'card_width',
      width: 100,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Select
              value={editingField.card_width}
              onChange={(val) => handleEditChange('card_width', val)}
              size="small"
              style={{ width: '100%' }}
            >
              {CARD_WIDTH_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.card_width;
      },
    },
    {
      title: '必填',
      dataIndex: 'is_required',
      width: 80,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Select
              value={editingField.is_required}
              onChange={(val) => handleEditChange('is_required', val)}
              size="small"
              style={{ width: '100%' }}
            >
              {YES_NO_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.is_required ? <Tag color="red">是</Tag> : <Tag>否</Tag>;
      },
    },
    {
      title: '主键',
      dataIndex: 'is_primary_key',
      width: 80,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Select
              value={editingField.is_primary_key}
              onChange={(val) => handleEditChange('is_primary_key', val)}
              size="small"
              style={{ width: '100%' }}
            >
              {YES_NO_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.is_primary_key ? <Tag color="blue">是</Tag> : <Tag>否</Tag>;
      },
    },
    {
      title: '新增控制',
      dataIndex: 'add_control',
      width: 100,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Select
              value={editingField.add_control}
              onChange={(val) => handleEditChange('add_control', val)}
              size="small"
              style={{ width: '100%' }}
            >
              {CONTROL_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.add_control;
      },
    },
    {
      title: '更新控制',
      dataIndex: 'update_control',
      width: 100,
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Select
              value={editingField.update_control}
              onChange={(val) => handleEditChange('update_control', val)}
              size="small"
              style={{ width: '100%' }}
            >
              {CONTROL_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          );
        }
        return record.update_control;
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => {
        if (editingFieldId === record.id) {
          return (
            <Space>
              <Tooltip title="保存">
                <Button
                  type="link"
                  icon={<SaveOutlined />}
                  onClick={handleSaveField}
                />
              </Tooltip>
              <Tooltip title="取消">
                <Button type="link" onClick={handleCancelEdit}>
                  取消
                </Button>
              </Tooltip>
            </Space>
          );
        }
        return (
          <Space>
            <Tooltip title="编辑">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleStartEdit(record)}
              />
            </Tooltip>
            <Tooltip title="预览">
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() => handlePreview(record)}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteField(record.id)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: '表单设计',
        breadcrumb: {
          items: [
            { title: '项目详细设计' },
            { title: '表单设计' },
          ],
        },
      }}
    >
      <Card>
        {/* 顶部：项目选择 + 新建按钮 */}
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
                  {p.project_name} ({p.form_count} 个表单)
                </Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadProjects}>
              刷新
            </Button>
          </Space>
          <Space>
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

        {/* Tab 页：表单列表 */}
        {apps.length > 0 && (
          <Tabs
            type="card"
            activeKey={selectedFormId?.toString()}
            onChange={(key) => setSelectedFormId(Number(key))}
            tabBarExtraContent={
              <Space>
                <Button
                  type="default"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={async () => {
                    if (!selectedFormId) return;
                    try {
                      const res = await validateForm(selectedFormId);
                      if (res.code === 200) {
                        const { total_fields, passed_fields, failed_fields, details } = res.data;
                        if (failed_fields === 0) {
                          message.success(`校验通过！共 ${total_fields} 个字段`);
                        } else {
                          Modal.warning({
                            title: '表单校验结果',
                            width: 600,
                            content: (
                              <div>
                                <p>总字段数：{total_fields}</p>
                                <p>通过：{passed_fields}</p>
                                <p>失败：{failed_fields}</p>
                                <hr />
                                {details.map((item: any, index: number) => (
                                  <div key={index} style={{ marginBottom: 8 }}>
                                    <strong>{item.field_name} ({item.field_code})</strong>
                                    {item.errors.length > 0 && (
                                      <ul style={{ color: 'red', margin: '4px 0' }}>
                                        {item.errors.map((err: string, i: number) => (
                                          <li key={i}>{err}</li>
                                        ))}
                                      </ul>
                                    )}
                                    {item.warnings.length > 0 && (
                                      <ul style={{ color: 'orange', margin: '4px 0' }}>
                                        {item.warnings.map((warn: string, i: number) => (
                                          <li key={i}>{warn}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ),
                          });
                        }
                      }
                    } catch (error) {
                      message.error('校验失败');
                    }
                  }}
                >
                  校验表单
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateFormVisible(true)}
                >
                  新建表单
                </Button>
              </Space>
            }
          >
            {forms.map((form) => (
              <Tabs.TabPane
                key={form.id}
                tab={
                  <span>
                    {form.form_name}
                    <Tag style={{ marginLeft: 8 }}>{form.form_code}</Tag>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(form.id);
                      }}
                    />
                  </span>
                }
              />
            ))}
          </Tabs>
        )}

        {/* 字段表格 */}
        {selectedFormId && (
          <ProTable
            columns={columns}
            dataSource={fields}
            rowKey="id"
            loading={loading}
            search={false}
            options={false}
            pagination={false}
            scroll={{ x: 1800 }}
            toolBarRender={false}
          />
        )}

        {apps.length === 0 && !loading && (
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
            <Input.TextArea placeholder="请输入项目描述" />
          </Form.Item>
          <Form.Item name="linked_project_id" label="关联历史项目">
            <Select
              placeholder="选择历史项目（可选）"
              allowClear
              onChange={handleLinkHistoryProject}
            >
              {historyProjects.map((p: any) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button onClick={() => setCreateProjectVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建表单弹窗 */}
      <Modal
        title="新建表单"
        open={createFormVisible}
        onCancel={() => {
          setCreateFormVisible(false);
          createFormForm.resetFields();
        }}
        footer={null}
      >
        <Form form={createFormForm} onFinish={handleCreateForm} layout="vertical">
          <Form.Item
            name="form_name"
            label="表单名称"
            rules={[{ required: true, message: '请输入表单名称' }]}
          >
            <Input placeholder="请输入表单名称" />
          </Form.Item>
          <Form.Item
            name="form_code"
            label="表单编码"
            rules={[{ required: true, message: '请输入表单编码' }]}
          >
            <Input placeholder="请输入表单编码（英文）" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button onClick={() => setCreateFormVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 表单预览抽屉 */}
      <Drawer
        title="表单预览"
        placement="right"
        width={600}
        open={previewVisible}
        onClose={() => setPreviewVisible(false)}
      >
        {previewField && (
          <ProForm layout="vertical" submitter={false}>
            {renderFormControl(previewField)}
          </ProForm>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default FormDesign;
