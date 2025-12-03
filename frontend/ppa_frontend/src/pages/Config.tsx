import {
  createRiskItem,
  createRole,
  createTravelCost,
  deleteRiskItem,
  deleteRole,
  deleteTravelCost,
  getRiskItemList,
  getRoleList,
  getTravelCostList,
  updateRiskItem,
  updateRole,
  updateTravelCost,
} from '@/services/config';
import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { MenuOutlined } from '@ant-design/icons';
import {
  Button,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Tabs,
  Tooltip,
} from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import Web3DRiskConfig from './Config/Web3DRisk';

const RoleManagement = () => {
  const actionRef = useRef();

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'role_name',
      formItemProps: { rules: [{ required: true, message: '此项为必填项' }] },
    },
    {
      title: '人力单价 (元/人天)',
      dataIndex: 'unit_price',
      align: 'right',
      valueType: 'money',
      formItemProps: { rules: [{ required: true, message: '此项为必填项' }] },
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      align: 'center',
      render: (_, record, __, action) => (
        <Space
          size="middle"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <a onClick={() => action?.startEditable?.(record.id)}>编辑</a>
          <Popconfirm
            title="确认删除？"
            onConfirm={async () => {
              try {
                await deleteRole(record.id);
                message.success('删除成功');
                actionRef.current?.reload();
              } catch (error) {
                message.error('删除失败，请重试');
              }
            }}
          >
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async (params) => {
        const res = await getRoleList();
        return {
          data: res.data,
          success: true,
        };
      }}
      editable={{
        type: 'single',
        onSave: async (rowKey, data) => {
          try {
            if (data.id && data.id < 1000000000000) {
              // 更新已有记录
              await updateRole(data.id, {
                role_name: data.role_name,
                unit_price: data.unit_price,
              });
              message.success('更新成功');
            } else {
              // 新建记录
              await createRole({
                role_name: data.role_name,
                unit_price: data.unit_price,
              });
              message.success('创建成功');
            }
            // 刷新表格数据
            actionRef.current?.reload();
            return true;
          } catch (error) {
            message.error('操作失败，请重试');
            return false;
          }
        },
      }}
      rowKey="id"
      search={false}
      options={false}
      pagination={false}
      dateFormatter="string"
      headerTitle="角色与单价管理"
      toolBarRender={() => [
        <Button
          key="button"
          type="primary"
          onClick={() => {
            actionRef.current?.addEditRecord?.({
              id: Date.now(), // 临时唯一key
              role_name: '',
              unit_price: 0,
            });
          }}
        >
          新建
        </Button>,
      ]}
    />
  );
};

const RiskItemManagement = () => {
  const actionRef = useRef();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const draggingIndexRef = useRef<number | null>(null);

  const categorySelectOptions = useMemo(
    () => categoryOptions.map((item) => ({ label: item, value: item })),
    [categoryOptions],
  );

  const handleOk = () => {
    form.submit();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const onFinish = async (values) => {
    try {
      const payload = {
        ...values,
        options_json: JSON.stringify(values.options_json),
      };

      if (editingRecord?.id) {
        // 更新
        await updateRiskItem(editingRecord.id, payload);
        message.success('更新成功');
      } else {
        // 新建
        await createRiskItem(payload);
        message.success('创建成功');
      }
      actionRef.current?.reload();
      handleCancel();
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  const handleAddCategory = () => {
    const value = newCategory.trim();
    if (!value) {
      return;
    }
    setCategoryOptions((prev) => {
      if (prev.includes(value)) {
        return prev;
      }
      return [...prev, value];
    });
    form.setFieldsValue({ category: value });
    setNewCategory('');
  };

  const columns = [
    {
      title: '评估类别',
      dataIndex: 'category',
    },
    {
      title: '评估项',
      dataIndex: 'item_name',
    },
    {
      title: '分值范围',
      dataIndex: 'score_range',
      align: 'center',
      render: (_, record) => {
        try {
          const options = JSON.parse(record.options_json);
          if (!options || options.length === 0) {
            return '-';
          }

          const scores = options.map((opt) => Number(opt.score));
          const min = Math.min(...scores);
          const max = Math.max(...scores);

          // 构建 Tooltip 内容
          const content = (
            <div style={{ maxWidth: 300 }}>
              {options.map((opt, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 'bold' }}>{opt.label}:</span>{' '}
                  {opt.score}分
                </div>
              ))}
            </div>
          );

          return (
            <Tooltip title={content}>
              <span style={{ cursor: 'help', color: '#1890ff' }}>
                {min} ~ {max}
              </span>
            </Tooltip>
          );
        } catch (e) {
          return '-';
        }
      },
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      align: 'center',
      render: (_, record) => (
        <Space
          size="middle"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <a
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue({
                ...record,
                options_json: JSON.parse(record.options_json),
              });
              setIsModalVisible(true);
            }}
          >
            编辑
          </a>
          <Popconfirm
            title="确认删除？"
            onConfirm={async () => {
              try {
                await deleteRiskItem(record.id);
                message.success('删除成功');
                actionRef.current?.reload();
              } catch (error) {
                message.error('删除失败，请重试');
              }
            }}
          >
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        cardBordered
        request={async () => {
          const res = await getRiskItemList();
          const items = res.data || [];
          setCategoryOptions(
            Array.from(
              new Set(items.map((item) => item.category).filter(Boolean)),
            ),
          );
          return {
            data: items,
            success: true,
          };
        }}
        rowKey="id"
        search={false}
        options={false}
        pagination={false}
        dateFormatter="string"
        headerTitle="风险评估项管理"
        toolBarRender={() => [
          <Button
            key="button"
            type="primary"
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            新建
          </Button>,
        ]}
      />
      <Modal
        title={editingRecord ? '编辑风险评估项' : '新建风险评估项'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={800}
      >
        <ProForm form={form} onFinish={onFinish} submitter={false}>
          <ProFormSelect
            name="category"
            label="评估类别"
            rules={[{ required: true }]}
            options={categorySelectOptions}
            fieldProps={{
              showSearch: true,
              allowClear: true,
              placeholder: '请选择或新增评估类别',
              optionFilterProp: 'label',
              dropdownRender: (menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '0 8px 4px',
                    }}
                  >
                    <Input
                      placeholder="输入新的评估类别"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onPressEnter={(event) => {
                        event.preventDefault();
                        handleAddCategory();
                      }}
                    />
                    <Button type="link" onClick={handleAddCategory}>
                      添加
                    </Button>
                  </div>
                </>
              ),
            }}
          />
          <ProFormText
            name="item_name"
            label="评估项"
            rules={[{ required: true }]}
          />
          <ProFormList
            name="options_json"
            label="选项列表"
            creatorButtonProps={{
              creatorButtonText: '新增选项',
            }}
            itemRender={(dom, listMeta) => {
              const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                const fromIndex = draggingIndexRef.current;
                const toIndex = listMeta.index;
                if (
                  typeof fromIndex === 'number' &&
                  typeof toIndex === 'number' &&
                  fromIndex !== toIndex
                ) {
                  listMeta.operation?.move?.(fromIndex, toIndex);
                }
                draggingIndexRef.current = null;
              };

              return (
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    background: '#fafafa',
                    marginBottom: 12,
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div
                    draggable
                    onDragStart={(event) => {
                      draggingIndexRef.current = listMeta.index;
                      event.dataTransfer?.setData('text/plain', String(listMeta.index));
                      if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onDragEnd={() => {
                      draggingIndexRef.current = null;
                    }}
                    title="拖拽调整顺序"
                    style={{
                      cursor: 'grab',
                      width: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      paddingTop: 6,
                    }}
                  >
                    <MenuOutlined />
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: 12 }}>
                    {dom.listDom}
                  </div>
                  <div style={{ }}>
                    {dom.action}
                  </div>
                </div>
              );
            }}
          >
            {(meta) => (
              <ProForm.Group
                key={meta.key}
                style={{
                  display: 'flex',
                  gridTemplateColumns: '1fr 88px',
                  columnGap: 12,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flex: 1,
                  marginBottom: 0,
                }}
              >
                <ProFormText
                  name="label"
                  label="选项描述"
                  rules={[{ required: true }]}
                  fieldProps={{ placeholder: '请输入选项描述' }}
                  formItemProps={{
                    style: { flex: 1, minWidth: 400, marginBottom: 0 },
                  }}
                />
                <ProFormDigit
                  name="score"
                  label="分值"
                  rules={[{ required: true }]}
                  fieldProps={{
                    style: { width: 88},
                    precision: 0,
                    step: 10,
                    min: 0,
                  }}
                  formItemProps={{ style: { marginBottom: 0 } }}
                />
              </ProForm.Group>
            )}
          </ProFormList>
        </ProForm>
      </Modal>
    </>
  );
};

const TravelCostManagement = () => {
  const actionRef = useRef();

  const columns = [
    {
      title: '成本项名称',
      dataIndex: 'item_name',
      formItemProps: { rules: [{ required: true, message: '此项为必填项' }] },
    },
    {
      title: '月度成本 (元/人)',
      dataIndex: 'cost_per_month',
      align: 'right',
      valueType: 'digit',
      fieldProps: {
        precision: 2,
        min: 0,
      },
      formItemProps: { rules: [{ required: true, message: '此项为必填项' }] },
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      align: 'center',
      render: (_, record, __, action) => (
        <Space
          size="middle"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <a onClick={() => action?.startEditable?.(record.id)}>编辑</a>
          <Popconfirm
            title="确认删除？"
            onConfirm={async () => {
              try {
                await deleteTravelCost(record.id);
                message.success('删除成功');
                actionRef.current?.reload();
              } catch (error) {
                message.error('删除失败，请重试');
              }
            }}
          >
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async () => {
        const res = await getTravelCostList();
        return {
          data: res.data,
          success: true,
        };
      }}
      editable={{
        type: 'single',
        onSave: async (rowKey, data) => {
          try {
            // 确保 cost_per_month 是数字类型
            const payload = {
              item_name: data.item_name,
              cost_per_month: Number(data.cost_per_month),
            };

            if (data.id && data.id < 1000000000000) {
              // 更新已有记录
              await updateTravelCost(data.id, payload);
              message.success('更新成功');
            } else {
              // 新建记录
              await createTravelCost(payload);
              message.success('创建成功');
            }
            // 刷新表格数据
            actionRef.current?.reload();
            return true;
          } catch (error) {
            message.error(`操作失败: ${error.message}`);
            console.error('保存差旅成本失败:', error);
            return false;
          }
        },
      }}
      rowKey="id"
      search={false}
      options={false}
      pagination={false}
      dateFormatter="string"
      headerTitle="差旅成本管理"
      toolBarRender={() => [
        <Button
          key="button"
          type="primary"
          onClick={() => {
            actionRef.current?.addEditRecord?.({
              id: Date.now(), // 临时唯一key
              item_name: '',
              cost_per_month: 0,
            });
          }}
        >
          新建
        </Button>,
      ]}
    />
  );
};

const ConfigPage = () => {
  const items = [
    {
      key: 'roles',
      label: '角色与单价管理',
      children: <RoleManagement />,
    },
    {
      key: 'risk-items',
      label: '风险评估项管理',
      children: <RiskItemManagement />,
    },
    {
      key: 'travel-costs',
      label: '差旅成本管理',
      children: <TravelCostManagement />,
    },
    {
      key: 'web3d-risk',
      label: 'Web3D 风险配置',
      children: <Web3DRiskConfig />,
    },
  ];

  return (
    <PageContainer>
      <Tabs defaultActiveKey="roles" items={items} />
    </PageContainer>
  );
};

export default ConfigPage;
