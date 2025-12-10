import {
  calculateWeb3dProject,
  createWeb3dProject,
  getWeb3dRiskItems,
  getWeb3dWorkloadTemplates,
  getRoles,
} from '@/services/web3d';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Collapse,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
  Select,
  Checkbox,
  Slider,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

type RiskOption = { label: string; value: number };

const parseOptions = (optionsJson?: string): RiskOption[] => {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((opt) => {
        const label = opt?.label || opt?.name;
        const raw = opt?.value ?? opt?.score;
        const value = Number(raw);
        if (!label || !Number.isFinite(value)) return null;
        return { label, value };
      })
      .filter(Boolean) as RiskOption[];
  } catch {
    return [];
  }
};

const categoryLabel: Record<string, string> = {
  data_processing: '数据处理',
  core_dev: '核心开发',
  business_logic: '业务逻辑',
  performance: '性能与兼容性',
};

const terminalOptions = [
  '高性能显卡（如 RTX 4090）',
  '普通 PC',
  'iPad/平板',
  '手机',
  '大屏一体机',
];

const modelSourceOptions = [
  '客户自有正版模型',
  '网上下载/版权不明',
  '需我们重建/精修',
  '设计院可以给出BIM数据，但是需要贴图',
];

type RiskSelectionState = Record<string, number | undefined>;
type WorkloadRow = {
  key: string;
  category: string;
  item_name: string;
  quantity: number; // 这里表示交付系数，实际人天在 base_days
  base_days?: number;
  unit?: string;
  role_name?: string;
  unit_price_yuan?: number;
  role_names?: string[];
  delivery_factor?: number;
};

const defaultAssessment = {
  view_distance_range: [0.5, 1],
  target_terminals: ['普通 PC'],
  model_source: undefined,
  model_source_note: '',
};

const NewWeb3D: React.FC = () => {
  const [basicForm] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [riskItems, setRiskItems] = useState<API_WEB3D.RiskItem[]>([]);
  const [templates, setTemplates] = useState<API_WEB3D.WorkloadTemplate[]>([]);
  const [roles, setRoles] = useState<API.RoleConfig[]>([]);
  const [riskSelections, setRiskSelections] = useState<RiskSelectionState>({});
  const [workloadRows, setWorkloadRows] = useState<WorkloadRow[]>([]);
  const [calculation, setCalculation] =
    useState<API_WEB3D.CalculationResult | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const [riskRes, tplRes, rolesRes] = await Promise.all([
          getWeb3dRiskItems(),
          getWeb3dWorkloadTemplates(),
          getRoles(),
        ]);
        setRiskItems(riskRes?.data || []);
        setTemplates(tplRes?.data || []);
        setRoles(rolesRes?.data || []);

        // 初始化工作量行：每个类别取第一个模板
        const byCategory = new Map<string, API_WEB3D.WorkloadTemplate>();
        (tplRes?.data || []).forEach((tpl) => {
          if (!byCategory.has(tpl.category)) {
            byCategory.set(tpl.category, tpl);
          }
        });
        const defaultRole = rolesRes?.data?.[0]?.role_name || '';
        const defaultPrice = rolesRes?.data?.[0]?.unit_price || undefined;
        const initRows: WorkloadRow[] = Array.from(byCategory.values()).map(
          (tpl) => ({
            key: `${tpl.category}-${tpl.item_name}`,
            category: tpl.category,
            item_name: tpl.item_name,
            quantity: 1, // 交付系数
            base_days: tpl.base_days, // 人天
            unit: tpl.unit,
            role_name: defaultRole,
            unit_price_yuan: defaultPrice,
            role_names: defaultRole ? [defaultRole] : [],
            delivery_factor: 1,
          }),
        );
        setWorkloadRows(initRows);
      } catch (err: any) {
        message.error(err?.message || '加载配置失败');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
    basicForm.setFieldsValue(defaultAssessment);
  }, [basicForm, message]);

  const groupedRisk = useMemo(() => {
    const groups = new Map<string, { title: string; items: API_WEB3D.RiskItem[] }>();
    riskItems
      .sort((a, b) => a.step_order - b.step_order)
      .forEach((ri) => {
        const key = ri.step_name || `Step ${ri.step_order}`;
        if (!groups.has(key)) {
          groups.set(key, { title: key, items: [] });
        }
        groups.get(key)?.items.push(ri);
      });
    return Array.from(groups.values());
  }, [riskItems]);

  const workloadOptionsByCategory = useMemo(() => {
    const map = new Map<string, API_WEB3D.WorkloadTemplate[]>();
    templates.forEach((tpl) => {
      const list = map.get(tpl.category) || [];
      list.push(tpl);
      map.set(tpl.category, list);
    });
    return map;
  }, [templates]);

  const buildAssessment = (): API_WEB3D.Assessment => {
    const basics = basicForm.getFieldsValue();
    const risk_selections = riskItems
      .map((ri) => ({
        item_name: ri.item_name,
        item_id: ri.id,
        selected_value: riskSelections[ri.item_name],
      }))
      .filter((r) => Number.isFinite(r.selected_value));

    const workload_items = workloadRows.map((row) => ({
      category: row.category,
      item_name: row.item_name,
      quantity: row.delivery_factor || row.quantity || 1,
      base_days: row.base_days, // 人天
      unit: row.unit,
      role_name: row.role_name,
      role_names: row.role_names,
      unit_price_yuan: row.unit_price_yuan,
    }));

    return {
      risk_selections,
      workload_items,
      view_distance_range: basics.view_distance_range,
      target_terminals: basics.target_terminals,
      model_source: basics.model_source,
      model_source_note: basics.model_source_note,
      mix_tech: false,
    };
  };

  const handleCalculate = async () => {
    try {
      await basicForm.validateFields(['name', 'target_terminals', 'model_source']);
      setLoading(true);
      const assessment = buildAssessment();
      const res = await calculateWeb3dProject(assessment);
      setCalculation(res?.data || null);
      message.success('计算完成');
    } catch (err: any) {
      message.error(err?.message || '计算失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await basicForm.validateFields(['name', 'target_terminals', 'model_source']);
      setLoading(true);
      const assessment = buildAssessment();
      const res = await createWeb3dProject({
        name: basicForm.getFieldValue('name'),
        description: basicForm.getFieldValue('description'),
        assessment,
      });
      message.success('创建成功');
      history.push('/web3d/history');
    } catch (err: any) {
      message.error(err?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const addWorkloadRow = () => {
    const first = templates[0];
    if (!first) return;
    const defaultRole = roles?.[0]?.role_name || '';
    const defaultPrice = roles?.[0]?.unit_price || undefined;
    const next: WorkloadRow = {
      key: `${first.category}-${first.item_name}-${Date.now()}`,
      category: first.category,
      item_name: first.item_name,
      quantity: 1,
      base_days: first.base_days,
      unit: first.unit,
      role_name: defaultRole,
      unit_price_yuan: defaultPrice,
      delivery_factor: 1,
    };
    setWorkloadRows((prev) => [...prev, next]);
  };

  const updateRow = (key: string, patch: Partial<WorkloadRow>) => {
    setWorkloadRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const merged = { ...row, ...patch };
        if (patch.item_name || patch.category) {
          const tpl =
            templates.find(
              (t) =>
                t.category === merged.category &&
                t.item_name === merged.item_name,
            ) || null;
          if (tpl) {
            merged.base_days = tpl.base_days;
            merged.unit = tpl.unit;
          }
        }
        if (patch.role_name) {
          const role = roles.find((r) => r.role_name === patch.role_name);
          merged.unit_price_yuan = role?.unit_price;
        }
        return merged;
      }),
    );
  };

  const replaceRowWithItems = (record: WorkloadRow, items: string[]) => {
    const template = templates.filter((tpl) => tpl.category === record.category);
    const defaultRole = record.role_name || roles?.[0]?.role_name || '';
    const defaultPrice =
      roles.find((r) => r.role_name === defaultRole)?.unit_price || roles?.[0]?.unit_price;
    const newRows: WorkloadRow[] = items.map((name) => {
      const tpl = template.find((t) => t.item_name === name);
      return {
        key: `${record.category}-${name}-${Date.now()}-${Math.random()}`,
        category: record.category,
        item_name: name,
        quantity: record.delivery_factor || record.quantity || 1,
        base_days: tpl?.base_days || record.base_days || 1,
        unit: tpl?.unit,
        role_name: defaultRole,
        unit_price_yuan: defaultPrice,
        delivery_factor: record.delivery_factor || 1,
      };
    });
    setWorkloadRows((prev) => {
      const others = prev.filter((r) => r.key !== record.key);
      return [...others, ...newRows];
    });
  };

  const removeRow = (key: string) => {
    setWorkloadRows((prev) => prev.filter((row) => row.key !== key));
  };

  const summaryCards = [
    {
      title: '总成本(万元)',
      value: calculation?.cost.total_cost_wan ?? 0,
    },
    {
      title: '工作量(人天)',
      value: calculation?.workload.total_days ?? 0,
    },
    {
      title: '风险系数',
      value: calculation?.risk_factor ?? 1,
    },
  ];

  const workloadColumns = [
    {
      title: '类别',
      dataIndex: 'category',
      render: (val: string, record: WorkloadRow) => (
        <Select
          value={val}
          style={{ minWidth: 160 }}
          onChange={(v) => updateRow(record.key, { category: v })}
          options={Array.from(workloadOptionsByCategory.keys()).map((c) => ({
            label: categoryLabel[c] || c,
            value: c,
          }))}
        />
      ),
    },
    {
      title: '工作项',
      dataIndex: 'item_name',
      render: (val: string, record: WorkloadRow) => {
        const opts = workloadOptionsByCategory.get(record.category) || [];
        return (
          <Select
            value={val}
            style={{ minWidth: 220 }}
            onChange={(v) => updateRow(record.key, { item_name: v })}
            options={opts.map((tpl) => ({
              label: tpl.item_name,
              value: tpl.item_name,
            }))}
          />
        );
      },
    },
    {
      title: '角色（多选取均价）',
      dataIndex: 'role_name',
      render: (_: string, record: WorkloadRow) => (
        <Select
          mode="multiple"
          value={record.role_names && record.role_names.length ? record.role_names : []}
          style={{ minWidth: 220 }}
          onChange={(values) => {
            const selected = (values as string[]) || [];
            const avg =
              selected.reduce((sum, roleName) => {
                const role = roles.find((r) => r.role_name === roleName);
                return sum + (role?.unit_price || 0);
              }, 0) / (selected.length || 1);
            updateRow(record.key, {
              role_name: selected[0] || '',
              role_names: selected,
              unit_price_yuan: avg || undefined,
            });
          }}
          options={roles.map((r) => ({
            label: `${r.role_name}（¥${r.unit_price}）`,
            value: r.role_name,
          }))}
        />
      ),
    },
    {
      title: '均价(元/天)',
      dataIndex: 'unit_price_yuan',
      render: (_: number, record: WorkloadRow) => record.unit_price_yuan ?? '-',
    },
    {
      title: '人天',
      dataIndex: 'base_days',
      render: (val: number | undefined, record: WorkloadRow) => (
        <InputNumber
          min={0.1}
          step={0.1}
          value={val}
          onChange={(num) => updateRow(record.key, { base_days: Number(num || 1) })}
        />
      ),
    },
    {
      title: '交付系数',
      dataIndex: 'delivery_factor',
      render: (val: number | undefined, record: WorkloadRow) => (
        <InputNumber
          min={0.1}
          step={0.1}
          value={val || 1}
          onChange={(num) =>
            updateRow(record.key, {
              delivery_factor: Number(num || 1),
              quantity: Number(num || 1),
            })
          }
        />
      ),
    },
    {
      title: '小计(万元)',
      render: (_: unknown, record: WorkloadRow) =>
        (
          ((record.base_days || 0) *
            (record.delivery_factor || record.quantity || 1) *
            ((record.unit_price_yuan || 0) / 10000)) ||
          0
        ).toFixed(2),
    },
    {
      title: '操作',
      render: (_: unknown, record: WorkloadRow) => (
        <Button danger type="link" onClick={() => removeRow(record.key)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      loading={loading}
      title="Web3D 新建评估"
    >
      <Steps
        current={currentStep}
        items={[
          { title: 'Step1 背景/选型' },
          { title: 'Step2 数据资产' },
          { title: 'Step3 开发需求' },
          { title: 'Step4 工作量估算' },
          { title: 'Step5 总览与报价' },
        ]}
        style={{ marginBottom: 16 }}
      />

      {currentStep === 0 && (
        <Card title="Step1 项目背景与技术选型">
          <Form form={basicForm} layout="vertical" initialValues={defaultAssessment}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
                  <Input placeholder="请输入项目名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="模型来源与版权"
                  name="model_source"
                  rules={[{ required: true, message: '请选择模型来源' }]}
                  extra="版权不明或精度差 → 预留从零建模费用。"
                >
                  <Select options={modelSourceOptions.map((m) => ({ label: m, value: m }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="可视距离范围（米）" name="view_distance_range">
                  <Slider
                    range
                    min={0.5}
                    max={8}
                    step={0.1}
                    defaultValue={[0.5, 1]}
                    tooltip={{ formatter: (v) => `${v} 米` }}
                    marks={{ 0.5: '0.5', 2: '2', 4: '4', 6: '6', 8: '8' }}
                  />
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                    推荐：大屏 3-6 米；触摸墙/汇报 0.8-1.5 米；操作员 0.5-0.7 米。
                  </Typography.Paragraph>
                </Form.Item>
              </Col>
              <Col span={12}>
            <Form.Item
              label="目标终端与显卡"
              name="target_terminals"
              rules={[{ required: true, message: '请选择目标终端与显卡' }]}
              extra="iPad/移动端显存受限，应关闭特效、砍面数 80%。"
            >
              <Checkbox.Group options={terminalOptions} />
            </Form.Item>
              </Col>
            </Row>
            <Form.Item label="模型来源备注" name="model_source_note">
              <Input placeholder="可填写模型格式/精度/贴图情况等" />
            </Form.Item>
            <Form.Item label="项目描述" name="description">
              <Input.TextArea rows={3} placeholder="填写技术路线、终端（PC/移动/大屏）、性能目标等" />
            </Form.Item>
          </Form>
          <Divider />
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {groupedRisk
              .filter((g) => g.title.includes('项目背景') || g.title.includes('技术'))
              .map((group) => (
                <Card key={group.title} size="small" title={group.title}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {group.items.map((item) => {
                      const options = parseOptions(item.options_json);
                      return (
                        <div key={item.id}>
                          <Space align="start">
                            <Typography.Text strong>{item.item_name}</Typography.Text>
                            <Tag color="blue">权重 {item.weight}</Tag>
                          </Space>
                          <Radio.Group
                            style={{ marginTop: 8 }}
                            value={riskSelections[item.item_name]}
                            onChange={(e) =>
                              setRiskSelections((prev) => ({
                                ...prev,
                                [item.item_name]: e.target.value,
                              }))
                            }
                          >
                            {options.map((opt) => (
                              <Radio.Button key={opt.value} value={opt.value}>
                                {opt.label} ({opt.value})
                              </Radio.Button>
                            ))}
                          </Radio.Group>
                        </div>
                      );
                    })}
                  </Space>
                </Card>
              ))}
          </Space>
        </Card>
      )}

      {currentStep === 1 && (
        <Card title="Step2 数据资产现状">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {groupedRisk
              .filter((g) => g.title.includes('数据资产') || g.title.includes('数据'))
              .map((group) => (
                <Card key={group.title} size="small" title={group.title}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {group.items.map((item) => {
                      const options = parseOptions(item.options_json);
                      return (
                        <div key={item.id}>
                          <Space align="start">
                            <Typography.Text strong>{item.item_name}</Typography.Text>
                            <Tag color="red">核心风险</Tag>
                            <Tag color="blue">权重 {item.weight}</Tag>
                          </Space>
                          <Radio.Group
                            style={{ marginTop: 8 }}
                            value={riskSelections[item.item_name]}
                            onChange={(e) =>
                              setRiskSelections((prev) => ({
                                ...prev,
                                [item.item_name]: e.target.value,
                              }))
                            }
                          >
                            {options.map((opt) => (
                              <Radio.Button key={opt.value} value={opt.value}>
                                {opt.label} ({opt.value})
                              </Radio.Button>
                            ))}
                          </Radio.Group>
                        </div>
                      );
                    })}
                  </Space>
                </Card>
              ))}
          </Space>
        </Card>
      )}

      {currentStep === 2 && (
        <Card
          title="Step3 开发需求（视觉/交互/性能）"
          extra={
            <Tooltip title="参考 PRD: FPS>30、首屏<5-15s，按选项评分">
              <InfoCircleOutlined />
            </Tooltip>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {groupedRisk
              .filter((g) => g.title.includes('开发需求') || g.title.includes('开发'))
              .map((group) => (
                <Card key={group.title} size="small" title={group.title}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {group.items.map((item) => {
                      const options = parseOptions(item.options_json);
                      return (
                        <div key={item.id}>
                          <Space align="start">
                            <Typography.Text strong>{item.item_name}</Typography.Text>
                            <Tag color="blue">权重 {item.weight}</Tag>
                          </Space>
                          <Radio.Group
                            style={{ marginTop: 8 }}
                            value={riskSelections[item.item_name]}
                            onChange={(e) =>
                              setRiskSelections((prev) => ({
                                ...prev,
                                [item.item_name]: e.target.value,
                              }))
                            }
                          >
                            {options.map((opt) => (
                              <Radio.Button key={opt.value} value={opt.value}>
                                {opt.label} ({opt.value})
                              </Radio.Button>
                            ))}
                          </Radio.Group>
                        </div>
                      );
                    })}
                  </Space>
                </Card>
              ))}
          </Space>
        </Card>
      )}

      {currentStep === 3 && (
        <Card
          title="Step4 工作量估算"
          extra={
            <Tooltip title="按模板选项与数量计算 A/B/C 分类工作量">
              <InfoCircleOutlined />
            </Tooltip>
          }
        >
          <Table
            pagination={false}
            rowKey="key"
            dataSource={workloadRows}
            columns={workloadColumns}
            summary={() => (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={workloadColumns.length}>
                    <Space>
                      <Button type="dashed" icon={<PlusOutlined />} onClick={addWorkloadRow}>
                        新增一行
                      </Button>
                      <Typography.Text type="secondary">
                        滚动到表尾后可连续新增，无需回到顶部
                      </Typography.Text>
                    </Space>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Card>
      )}

      {currentStep === 4 && (
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Card title="Step5 总览与报价">
              <Row gutter={12}>
                {summaryCards.map((card) => (
                  <Col span={8} key={card.title}>
                    <Statistic
                      title={card.title}
                      value={card.value ?? 0}
                      precision={2}
                    />
                  </Col>
                ))}
              </Row>
              <Divider />
              <Typography.Title level={5}>风险评分明细</Typography.Title>
              <Collapse
                bordered={false}
                items={groupedRisk.map((group) => ({
                  key: group.title,
                  label: group.title,
                  children: (
                    <Descriptions
                      size="small"
                      bordered
                      column={2}
                      labelStyle={{ width: 220 }}
                      contentStyle={{ minWidth: 80 }}
                    >
                      {group.items.map((item) => {
                        const val = riskSelections[item.item_name];
                        return (
                          <Descriptions.Item
                            key={item.id}
                            label={
                              <Space size={4}>
                                <Typography.Text>{item.item_name}</Typography.Text>
                                <Tag color="blue">权重 {item.weight}</Tag>
                              </Space>
                            }
                          >
                            {val != null ? val : '未选'}
                          </Descriptions.Item>
                        );
                      })}
                    </Descriptions>
                  ),
                }))}
              />
              <Divider />
              <Typography.Title level={5}>工作量明细</Typography.Title>
              <Table
                size="small"
                pagination={false}
                rowKey="key"
                dataSource={workloadRows}
                columns={[
                  { title: '类别', dataIndex: 'category', render: (v) => categoryLabel[v] || v },
                  { title: '工作项', dataIndex: 'item_name' },
                  { title: '工作量（人天）', dataIndex: 'base_days', align: 'center' },
                  {
                    title: '小计(万元)',
                    align: 'right',
                    render: (_, record) =>
                      (
                        ((record.base_days || 0) *
                          (record.quantity || 0) *
                          ((record.unit_price_yuan || 0) / 10000)) || 0
                      ).toFixed(2),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="操作">
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  <Space direction="vertical">
                    <span>基础成本(万元)：{calculation?.cost.base_cost_wan ?? 0}</span>
                    <span>风险系数：{calculation?.risk_factor ?? 1}</span>
                    <span>报价总计(万元)：{calculation?.cost.total_cost_wan ?? 0}</span>
                    <span style={{ color: '#999', fontSize: 12 }}>
                      计算流程：基础成本（Step4） × 风险系数（Step1-3） = 总成本（Step5）
                    </span>
                  </Space>
                </Typography.Paragraph>
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={handleCalculate}>
                    重新计算
                  </Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
                    保存项目
                  </Button>
                </Space>
                <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
                  生成的报价/风险/工作量计算将随项目保存，历史项目可导出 XLSX。
                </Typography.Paragraph>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      <Space style={{ marginTop: 16 }}>
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep((s) => s - 1)}>上一步</Button>
        )}
        {currentStep < 4 && (
          <Button
            type="primary"
            onClick={async () => {
              if (currentStep === 0) {
                try {
                  await basicForm.validateFields(['name', 'target_terminals', 'model_source']);
                } catch {
                  return;
                }
              }
              setCurrentStep((s) => s + 1);
            }}
          >
            下一步
          </Button>
        )}
      </Space>
    </PageContainer>
  );
};

export default NewWeb3D;
