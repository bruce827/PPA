import {
  createWeb3dRiskItem,
  createWeb3dWorkloadTemplate,
  deleteWeb3dRiskItem,
  deleteWeb3dWorkloadTemplate,
  getWeb3dRiskItems,
  getWeb3dWorkloadTemplates,
  updateWeb3dRiskItem,
  updateWeb3dWorkloadTemplate,
} from '@/services/web3d';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Select,
  Divider,
} from 'antd';
import React, { useEffect, useState } from 'react';

const extractErrorMsg = (err: any, fallback = '操作失败') =>
  err?.response?.data?.message || err?.data?.message || err?.message || fallback;

type RiskModalState =
  | { mode: 'create'; record?: null }
  | { mode: 'edit'; record: API_WEB3D.RiskItem }
  | null;

type WorkloadModalState =
  | { mode: 'create'; record?: null }
  | { mode: 'edit'; record: API_WEB3D.WorkloadTemplate }
  | null;

const categoryOptions = [
  { label: '数据处理', value: 'data_processing' },
  { label: '核心开发', value: 'core_dev' },
  { label: '业务逻辑', value: 'business_logic' },
  { label: '性能与兼容性', value: 'performance' },
];

const stepOptions = [
  { label: 'Step 1: 项目背景与技术选型', value: 'Step 1: 项目背景与技术选型' },
  { label: 'Step 2: 数据资产现状', value: 'Step 2: 数据资产现状' },
  { label: 'Step 3: 开发需求评估', value: 'Step 3: 开发需求评估' },
];

const stepNameToOrder = (name?: string) => {
  if (!name) return undefined;
  if (name.startsWith('Step 1')) return 1;
  if (name.startsWith('Step 2')) return 2;
  if (name.startsWith('Step 3')) return 3;
  return undefined;
};

const Web3DRiskConfig: React.FC = () => {
  const { message } = App.useApp();
  const [riskItems, setRiskItems] = useState<API_WEB3D.RiskItem[]>([]);
  const [workloadTemplates, setWorkloadTemplates] = useState<
    API_WEB3D.WorkloadTemplate[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [riskModal, setRiskModal] = useState<RiskModalState>(null);
  const [workModal, setWorkModal] = useState<WorkloadModalState>(null);
  const [riskForm] = Form.useForm();
  const [workForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [riskRes, workRes] = await Promise.all([
        getWeb3dRiskItems(),
        getWeb3dWorkloadTemplates(),
      ]);
      setRiskItems(riskRes?.data || []);
      setWorkloadTemplates(workRes?.data || []);
    } catch (err: any) {
      message.error(err?.message || '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRiskModal = (payload: RiskModalState) => {
    setRiskModal(payload);
    if (payload?.record) {
      let options = [];
      try {
        const parsed = JSON.parse(payload.record.options_json || '[]');
        if (Array.isArray(parsed)) options = parsed;
      } catch (_e) {
        options = [];
      }
      riskForm.setFieldsValue({
        ...payload.record,
        step_order: payload.record.step_order ?? stepNameToOrder(payload.record.step_name),
        options,
      });
    } else {
      riskForm.resetFields();
      riskForm.setFieldValue('step_order', 1);
      riskForm.setFieldValue('options', [{ label: '', value: 1 }]);
    }
  };

  const submitRisk = async () => {
    const values = await riskForm.validateFields();
    const options = Array.isArray(values.options) ? values.options : [];
    try {
      if (riskModal?.mode === 'edit' && riskModal.record) {
        await updateWeb3dRiskItem(riskModal.record.id, {
          ...values,
          options_json: JSON.stringify(options),
        });
      } else {
        await createWeb3dRiskItem({
          ...values,
          options_json: JSON.stringify(options),
        });
      }
      message.success('保存成功');
      setRiskModal(null);
      load();
    } catch (err: any) {
      message.error(extractErrorMsg(err, '保存失败'));
    }
  };

  const submitWork = async () => {
    const values = await workForm.validateFields();
    try {
      if (workModal?.mode === 'edit' && workModal.record) {
        await updateWeb3dWorkloadTemplate(workModal.record.id, values);
      } else {
        await createWeb3dWorkloadTemplate(values);
      }
      message.success('保存成功');
      setWorkModal(null);
      workForm.resetFields();
      load();
    } catch (err: any) {
      message.error(extractErrorMsg(err, '保存失败'));
    }
  };

  const openWorkModal = (payload: WorkloadModalState) => {
    setWorkModal(payload);
    if (payload?.record) {
      workForm.setFieldsValue(payload.record);
    } else {
      workForm.resetFields();
    }
  };

  const deleteRisk = async (id: number) => {
    try {
      await deleteWeb3dRiskItem(id);
      message.success('已删除');
      load();
    } catch (err: any) {
      message.error(extractErrorMsg(err, '删除失败'));
    }
  };

  const deleteWork = async (id: number) => {
    try {
      await deleteWeb3dWorkloadTemplate(id);
      message.success('已删除');
      load();
    } catch (err: any) {
      message.error(extractErrorMsg(err, '删除失败'));
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card
        title="风险项配置"
        extra={
          <Button type="primary" onClick={() => openRiskModal({ mode: 'create' })}>
            新增风险项
          </Button>
        }
        loading={loading}
      >
          <Table
            rowKey="id"
            dataSource={riskItems}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: '步骤', dataIndex: 'step_order', width: 90 },
              { title: '步骤名称', dataIndex: 'step_name', ellipsis: false, width: 220 },
              { title: '风险项', dataIndex: 'item_name', width: 240 },
              { title: '权重', dataIndex: 'weight', width: 90, align: 'center' },
              {
                title: '选项',
              dataIndex: 'options_json',
              render: (json) => {
                try {
                  const opts = JSON.parse(json);
                  if (!Array.isArray(opts)) return '-';
                  return (
                    <Space wrap>
                      {opts.map((o: any) => (
                        <Tag key={o?.label}>{`${o?.label ?? ''} (${o?.value ?? ''})`}</Tag>
                      ))}
                    </Space>
                  );
                } catch {
                  return '-';
                }
              },
            },
            {
              title: '操作',
              width: 160,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => openRiskModal({ mode: 'edit', record })}>
                    编辑
                  </Button>
                  <Button danger type="link" onClick={() => deleteRisk(record.id)}>
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card
        title="工作量模板"
        extra={
          <Button type="primary" onClick={() => openWorkModal({ mode: 'create' })}>
            新增模板
          </Button>
        }
        loading={loading}
      >
        <Table
          rowKey="id"
          dataSource={workloadTemplates}
          pagination={{ pageSize: 10 }}
            columns={[
              {
                title: '类别',
                dataIndex: 'category',
                render: (v) => categoryOptions.find((c) => c.value === v)?.label || v,
              },
              { title: '工作项', dataIndex: 'item_name' },
              { title: '基准工时(天)', dataIndex: 'base_days', width: 140 },
              // 单位暂隐藏，不参与计算
              { title: '描述', dataIndex: 'description' },
            {
              title: '操作',
              width: 160,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => openWorkModal({ mode: 'edit', record })}>
                    编辑
                  </Button>
                  <Button danger type="link" onClick={() => deleteWork(record.id)}>
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={riskModal?.mode === 'edit' ? '编辑风险项' : '新增风险项'}
        open={!!riskModal}
        onOk={submitRisk}
        onCancel={() => setRiskModal(null)}
        destroyOnHidden
      >
        <Form form={riskForm} layout="vertical">
          <Form.Item
            name="step_name"
            label="步骤名称"
            rules={[{ required: true, message: '请选择步骤名称' }]}
          >
            <Select
              options={stepOptions}
              placeholder="请选择步骤"
              showSearch
              optionFilterProp="label"
              onChange={(v) => {
                riskForm.setFieldValue('step_name', v);
                riskForm.setFieldValue('step_order', stepNameToOrder(v));
              }}
            />
          </Form.Item>
          <Form.Item name="step_order" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="item_name"
            label="风险项名称"
            rules={[{ required: true, message: '请输入风险项名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="weight"
            label="权重"
            rules={[{ required: true, message: '请输入权重' }]}
          >
            <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Divider style={{ margin: '12px 0' }} />
          <Form.List name="options" rules={[{ required: true, message: '请至少添加一个选项' }]}>
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space align="center">
                    <span style={{ fontWeight: 500 }}>选项列表</span>
                    <Tooltip title="每行包含显示文案与对应分值，提交时自动转换为 JSON">
                      <Tag color="blue">示例：Three.js / 1</Tag>
                    </Tooltip>
                  </Space>
                  <Button type="link" onClick={() => add({ label: '', value: 1 })}>
                    新增选项
                  </Button>
                </div>
                {fields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      width: '100%',
                    }}
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, 'label']}
                      style={{ flex: 1, marginBottom: 0 }}
                      rules={[{ required: true, message: '请输入显示文案' }]}
                    >
                      <Input placeholder="显示文案，如 Three.js" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'value']}
                      style={{ width: 100, marginBottom: 0 }}
                      rules={[{ required: true, message: '请输入分值' }]}
                    >
                      <InputNumber placeholder="分值" min={0} step={0.1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Button type="link" danger onClick={() => remove(field.name)}>
                      删除
                    </Button>
                  </div>
                ))}
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title={workModal?.mode === 'edit' ? '编辑模板' : '新增模板'}
        open={!!workModal}
        onOk={submitWork}
        onCancel={() => setWorkModal(null)}
        destroyOnHidden
      >
        <Form form={workForm} layout="vertical">
          <Form.Item
            name="category"
            label="类别"
            rules={[{ required: true, message: '请选择类别' }]}
          >
            <Select options={categoryOptions} placeholder="请选择类别" />
          </Form.Item>
          <Form.Item
            name="item_name"
            label="工作项名称"
            rules={[{ required: true, message: '请输入工作项名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="base_days"
            label="基准工时(天)"
            rules={[{ required: true, message: '请输入基准工时' }]}
          >
            <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default Web3DRiskConfig;
