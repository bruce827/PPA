import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo, useState } from 'react';

const IOT_MODULE_NAME = 'IoT点位对接';
const DEFAULT_DEVICE_POINT_COUNT = 10;

type IotPointIntegrationEstimatorProps = {
  roles: API.RoleConfig[];
  value?: API.IotPointIntegration;
  onValueChange: (value: API.IotPointIntegration) => void;
  onApplyWorkload: (iotValue: API.IotPointIntegration) => void;
};

type RolePreference = 'backend' | 'implementation';

type WorkPackageDefinition = {
  key: string;
  packageName: string;
  rolePreference: RolePreference;
  calculateDays: (
    params: API.IotPointIntegrationScaleParams,
    estimatedPointCount: number,
  ) => number;
  buildBasis: (
    params: API.IotPointIntegrationScaleParams,
    estimatedPointCount: number,
    estimatedByDeviceCount: boolean,
  ) => string;
};

const roundToOneDecimal = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10;
};

const toPositiveNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return numeric;
};

const ceilDiv = (value: number, divisor: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / divisor);
};

const defaultScaleParams: API.IotPointIntegrationScaleParams = {
  point_count: 0,
  device_count: 0,
  site_count: 0,
  gateway_count: 0,
  protocol_type_count: 0,
  has_private_protocol: false,
  control_point_count: 0,
  alarm_point_count: 0,
  alarm_rule_count: 0,
  high_frequency_point_count: 0,
  data_cleaning_point_count: 0,
  computed_point_count: 0,
  historical_storage_point_count: 0,
  need_onsite_debug: false,
  onsite_debug_times: 0,
  acceptance_sample_ratio: 0,
  site_scale_note: '',
};

const defaultAssumptions: API.IotPointIntegration['assumptions'] = {
  has_iot_platform: true,
  includes_platform_build: false,
  risk_factor_source: 'standard_assessment',
};

const workPackageDefinitions: WorkPackageDefinition[] = [
  {
    key: 'point_table_cleanup',
    packageName: '点表整理',
    rolePreference: 'implementation',
    calculateDays: (_params, estimatedPointCount) =>
      estimatedPointCount > 0
        ? 0.5 + ceilDiv(estimatedPointCount, 500) * 0.5
        : 0,
    buildBasis: (_params, estimatedPointCount, estimatedByDeviceCount) =>
      `按${
        estimatedByDeviceCount ? '设备台数折算' : '点位总数'
      } ${estimatedPointCount} 点估算，基础 0.5 天 + 每 500 点 0.5 天。`,
  },
  {
    key: 'protocol_driver_config',
    packageName: '协议/驱动配置',
    rolePreference: 'backend',
    calculateDays: (params) =>
      toPositiveNumber(params.protocol_type_count) * 1 +
      (params.has_private_protocol ? 3 : 0),
    buildBasis: (params) =>
      `标准协议 ${toPositiveNumber(params.protocol_type_count)} 类 × 1 天${
        params.has_private_protocol ? '，存在私有协议额外 +3 天' : ''
      }。`,
  },
  {
    key: 'point_mapping',
    packageName: '点位映射',
    rolePreference: 'backend',
    calculateDays: (_params, estimatedPointCount) =>
      ceilDiv(estimatedPointCount, 500) * 1,
    buildBasis: (_params, estimatedPointCount) =>
      `按 ${estimatedPointCount} 点映射到平台统一点位模型，每 500 点 1 天。`,
  },
  {
    key: 'data_cleaning_unit_conversion',
    packageName: '数据清洗与单位换算',
    rolePreference: 'backend',
    calculateDays: (params) =>
      ceilDiv(
        toPositiveNumber(params.data_cleaning_point_count) +
          toPositiveNumber(params.computed_point_count),
        200,
      ) * 1,
    buildBasis: (params) =>
      `清洗/换算点 ${toPositiveNumber(
        params.data_cleaning_point_count,
      )} 个，计算/衍生点 ${toPositiveNumber(
        params.computed_point_count,
      )} 个，每 200 点 1 天。`,
  },
  {
    key: 'alarm_rule_config',
    packageName: '告警规则配置',
    rolePreference: 'backend',
    calculateDays: (params) =>
      ceilDiv(toPositiveNumber(params.alarm_rule_count), 100) * 1,
    buildBasis: (params) =>
      `告警点 ${toPositiveNumber(
        params.alarm_point_count,
      )} 个，告警规则 ${toPositiveNumber(
        params.alarm_rule_count,
      )} 条，每 100 条规则 1 天。`,
  },
  {
    key: 'batch_import',
    packageName: '批量导入',
    rolePreference: 'implementation',
    calculateDays: (_params, estimatedPointCount) =>
      estimatedPointCount > 0
        ? 0.5 + ceilDiv(estimatedPointCount, 1000) * 0.5
        : 0,
    buildBasis: (_params, estimatedPointCount) =>
      `按 ${estimatedPointCount} 点批量导入，基础 0.5 天 + 每 1000 点 0.5 天。`,
  },
  {
    key: 'onsite_debug',
    packageName: '现场联调',
    rolePreference: 'implementation',
    calculateDays: (params) => {
      if (!params.need_onsite_debug) return 0;
      return (
        Math.max(
          toPositiveNumber(params.onsite_debug_times),
          toPositiveNumber(params.site_count),
        ) * 1
      );
    },
    buildBasis: (params) =>
      params.need_onsite_debug
        ? `现场联调次数 ${toPositiveNumber(
            params.onsite_debug_times,
          )} 次，站点/区域 ${toPositiveNumber(
            params.site_count,
          )} 个，按两者较大值 × 1 天。`
        : '本次不包含现场联调，工作量记 0。需远程验收时仍保留验收核对工作包。',
  },
  {
    key: 'acceptance_check',
    packageName: '验收核对',
    rolePreference: 'implementation',
    calculateDays: (params, estimatedPointCount) => {
      if (estimatedPointCount <= 0) return 0;
      const sampleRatio = toPositiveNumber(params.acceptance_sample_ratio);
      const sampleCount = Math.ceil((estimatedPointCount * sampleRatio) / 100);
      return sampleCount > 0 ? Math.max(0.5, (sampleCount / 100) * 0.5) : 0;
    },
    buildBasis: (params, estimatedPointCount) => {
      const sampleRatio = toPositiveNumber(params.acceptance_sample_ratio);
      const sampleCount = Math.ceil((estimatedPointCount * sampleRatio) / 100);
      return sampleCount > 0
        ? `按 ${sampleRatio}% 抽检 ${sampleCount} 点，核对接通率、准确率、延迟和告警触发，最低 0.5 天。`
        : '未设置验收抽检比例或估算点位数，验收核对工作量记 0。';
    },
  },
];

const normalizeScaleParams = (
  raw?: Partial<API.IotPointIntegrationScaleParams>,
): API.IotPointIntegrationScaleParams => ({
  ...defaultScaleParams,
  ...(raw || {}),
  has_private_protocol: Boolean(raw?.has_private_protocol),
  need_onsite_debug:
    typeof raw?.need_onsite_debug === 'boolean'
      ? raw.need_onsite_debug
      : defaultScaleParams.need_onsite_debug,
});

const buildDefaultValue = (
  value?: API.IotPointIntegration,
): API.IotPointIntegration => ({
  assumptions: {
    ...defaultAssumptions,
    ...(value?.assumptions || {}),
  },
  scale_params: normalizeScaleParams(value?.scale_params),
  generated_items: Array.isArray(value?.generated_items)
    ? value.generated_items
    : [],
  estimated_point_count: value?.estimated_point_count,
  estimated_by_device_count: value?.estimated_by_device_count,
  applied_at: value?.applied_at,
});

const resolveRoleName = (
  roles: API.RoleConfig[],
  preference: RolePreference,
) => {
  const implementationRole = roles.find((role) =>
    String(role.role_name || '').includes('实施'),
  );
  const backendRole = roles.find((role) =>
    String(role.role_name || '').includes('后端'),
  );

  if (preference === 'implementation') {
    return (
      implementationRole?.role_name ||
      backendRole?.role_name ||
      roles[0]?.role_name ||
      ''
    );
  }
  return (
    backendRole?.role_name ||
    implementationRole?.role_name ||
    roles[0]?.role_name ||
    ''
  );
};

const calculateEstimatedPointCount = (
  params: API.IotPointIntegrationScaleParams,
) => {
  const pointCount = toPositiveNumber(params.point_count);
  if (pointCount > 0) {
    return {
      estimatedPointCount: pointCount,
      estimatedByDeviceCount: false,
    };
  }

  const deviceCount = toPositiveNumber(params.device_count);
  return {
    estimatedPointCount: deviceCount * DEFAULT_DEVICE_POINT_COUNT,
    estimatedByDeviceCount: deviceCount > 0,
  };
};

const buildWorkPackageItems = (
  params: API.IotPointIntegrationScaleParams,
  previousItems: API.IotPointIntegrationItem[],
  roles: API.RoleConfig[],
): API.IotPointIntegrationItem[] => {
  const { estimatedPointCount, estimatedByDeviceCount } =
    calculateEstimatedPointCount(params);

  return workPackageDefinitions.map((definition) => {
    const suggestedDays = roundToOneDecimal(
      definition.calculateDays(params, estimatedPointCount),
    );
    const estimateBasis = definition.buildBasis(
      params,
      estimatedPointCount,
      estimatedByDeviceCount,
    );
    const previous = previousItems.find((item) => item.key === definition.key);
    const previousSuggested = roundToOneDecimal(
      toPositiveNumber(previous?.suggested_days),
    );
    const previousAdjusted = roundToOneDecimal(
      toPositiveNumber(previous?.adjusted_days),
    );
    const hasManualAdjustment =
      Boolean(previous) && previousAdjusted !== previousSuggested;

    return {
      key: definition.key,
      package_name: definition.packageName,
      estimate_basis: estimateBasis,
      suggested_days: suggestedDays,
      adjusted_days: hasManualAdjustment ? previousAdjusted : suggestedDays,
      role_name:
        previous?.role_name ||
        resolveRoleName(roles, definition.rolePreference),
      adjustment_note: previous?.adjustment_note || '',
    };
  });
};

const buildCalculatedValue = (
  baseValue: API.IotPointIntegration,
  roles: API.RoleConfig[],
  options?: { clearAppliedAt?: boolean },
): API.IotPointIntegration => {
  const scaleParams = normalizeScaleParams(baseValue.scale_params);
  const { estimatedPointCount, estimatedByDeviceCount } =
    calculateEstimatedPointCount(scaleParams);

  return {
    ...baseValue,
    assumptions: defaultAssumptions,
    scale_params: scaleParams,
    generated_items: buildWorkPackageItems(
      scaleParams,
      Array.isArray(baseValue.generated_items)
        ? baseValue.generated_items
        : [],
      roles,
    ),
    estimated_point_count: estimatedPointCount,
    estimated_by_device_count: estimatedByDeviceCount,
    applied_at: options?.clearAppliedAt ? undefined : baseValue.applied_at,
  };
};

const IotPointIntegrationEstimator: React.FC<
  IotPointIntegrationEstimatorProps
> = ({ roles, value, onValueChange, onApplyWorkload }) => {
  const [form] = Form.useForm<API.IotPointIntegrationScaleParams>();
  const [iotValue, setIotValue] = useState<API.IotPointIntegration>(
    buildDefaultValue(value),
  );

  useEffect(() => {
    const nextValue = buildCalculatedValue(buildDefaultValue(value), roles);
    setIotValue(nextValue);
    form.setFieldsValue(nextValue.scale_params);
  }, [value, roles, form]);

  const rolePriceMap = useMemo(() => {
    const map = new Map<string, number>();
    roles.forEach((role) => {
      map.set(role.role_name, Number(role.unit_price || 0));
    });
    return map;
  }, [roles]);

  const generatedItems = iotValue.generated_items || [];

  const updateIotValue = (nextValue: API.IotPointIntegration) => {
    setIotValue(nextValue);
    onValueChange(nextValue);
  };

  const handleScaleValuesChange = (
    changed: Partial<API.IotPointIntegrationScaleParams>,
    allValues: API.IotPointIntegrationScaleParams,
  ) => {
    const nextValues = { ...allValues };
    if (
      typeof changed.alarm_point_count !== 'undefined' &&
      toPositiveNumber(allValues.alarm_rule_count) === 0
    ) {
      nextValues.alarm_rule_count = toPositiveNumber(changed.alarm_point_count);
      form.setFieldsValue({ alarm_rule_count: nextValues.alarm_rule_count });
    }
    updateIotValue(
      buildCalculatedValue(
        {
          ...iotValue,
          scale_params: normalizeScaleParams(nextValues),
        },
        roles,
        { clearAppliedAt: true },
      ),
    );
  };

  const updateGeneratedItem = (
    key: string,
    patch: Partial<API.IotPointIntegrationItem>,
  ) => {
    updateIotValue({
      ...iotValue,
      applied_at: undefined,
      generated_items: generatedItems.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    });
  };

  const handleApply = () => {
    if (!roles.length) {
      Modal.warning({
        title: '缺少角色配置',
        content: '请先在参数配置中维护角色单价。',
      });
      return;
    }
    const nextValue = {
      ...buildCalculatedValue(iotValue, roles),
      applied_at: new Date().toISOString(),
    };
    setIotValue(nextValue);
    onApplyWorkload(nextValue);
  };

  const suggestedTotalDays = generatedItems.reduce(
    (sum, item) => sum + toPositiveNumber(item.suggested_days),
    0,
  );
  const adjustedTotalDays = generatedItems.reduce(
    (sum, item) => sum + toPositiveNumber(item.adjusted_days),
    0,
  );
  const estimatedCostWan = generatedItems.reduce((sum, item) => {
    const unitPrice = rolePriceMap.get(item.role_name) || 0;
    return sum + (toPositiveNumber(item.adjusted_days) * unitPrice) / 10000;
  }, 0);

  const columns: ColumnsType<API.IotPointIntegrationItem> = [
    {
      title: '工作包',
      dataIndex: 'package_name',
      width: 150,
      fixed: 'left',
    },
    {
      title: '估算依据',
      dataIndex: 'estimate_basis',
      width: 360,
    },
    {
      title: '建议人天',
      dataIndex: 'suggested_days',
      width: 110,
      align: 'right',
      render: (value) => Number(value || 0).toFixed(1),
    },
    {
      title: '调整后人天',
      dataIndex: 'adjusted_days',
      width: 140,
      render: (_value, record) => (
        <InputNumber
          min={0}
          precision={1}
          style={{ width: '100%' }}
          value={record.adjusted_days}
          onChange={(nextValue) =>
            updateGeneratedItem(record.key, {
              adjusted_days: roundToOneDecimal(toPositiveNumber(nextValue)),
            })
          }
        />
      ),
    },
    {
      title: '角色',
      dataIndex: 'role_name',
      width: 150,
      render: (_value, record) => (
        <Select
          style={{ width: '100%' }}
          value={record.role_name || undefined}
          placeholder="选择角色"
          options={roles.map((role) => ({
            label: role.role_name,
            value: role.role_name,
          }))}
          onChange={(roleName) =>
            updateGeneratedItem(record.key, { role_name: roleName })
          }
        />
      ),
    },
    {
      title: '调整说明',
      dataIndex: 'adjustment_note',
      width: 220,
      render: (_value, record) => (
        <Input
          value={record.adjustment_note}
          placeholder="可填写调整原因"
          onChange={(event) =>
            updateGeneratedItem(record.key, {
              adjustment_note: event.target.value,
            })
          }
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="评估前提"
        description="按已有 IoT 平台/网关能力进行点位接入实施评估；不包含 IoT 平台建设成本；风险溢价沿用当前项目风险评分因子。"
      />

      <Card title="规模参数">
        <Form
          form={form}
          layout="vertical"
          initialValues={iotValue.scale_params}
          onValuesChange={handleScaleValuesChange}
        >
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label="点位总数" name="point_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label="设备台数"
                name="device_count"
                tooltip="未填写点位总数时，按每台设备 10 个点位兜底估算。"
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="站点/区域数" name="site_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="网关数量" name="gateway_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="协议类型数" name="protocol_type_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label="存在私有协议"
                name="has_private_protocol"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="控制点数量" name="control_point_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="告警点数量" name="alarm_point_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="告警规则数量" name="alarm_rule_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label="高频采集点数量"
                name="high_frequency_point_count"
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label="清洗/换算点数量"
                name="data_cleaning_point_count"
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="计算/衍生点数量" name="computed_point_count">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label="历史存储点数量"
                name="historical_storage_point_count"
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label="需要现场联调"
                name="need_onsite_debug"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="现场联调次数" name="onsite_debug_times">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="验收抽检比例" name="acceptance_sample_ratio">
                <InputNumber
                  min={0}
                  max={100}
                  precision={0}
                  addonAfter="%"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="建筑面积/场地规模说明" name="site_scale_note">
                <Input.TextArea
                  rows={2}
                  placeholder="可填写建筑面积、楼栋、楼层、园区范围等，仅作为评估说明，不直接参与公式。"
                />
              </Form.Item>
            </Col>
          </Row>
          {iotValue.estimated_by_device_count ? (
            <Tag color="orange">
              未填写点位总数，按每台设备 {DEFAULT_DEVICE_POINT_COUNT} 点估算
            </Tag>
          ) : null}
        </Form>
      </Card>

      <Card
        title="8 项工作包"
        extra={
          <Space>
            <Tag color={iotValue.applied_at ? 'green' : 'default'}>
              {iotValue.applied_at ? '已确认' : '未确认'}
            </Tag>
            <Button type="primary" onClick={handleApply}>
              确认用于 IoT 独立报价
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Statistic
              title="估算点位数"
              value={iotValue.estimated_point_count || 0}
              suffix="点"
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="建议总人天"
              value={roundToOneDecimal(suggestedTotalDays)}
              suffix="人天"
              precision={1}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="调整后总人天"
              value={roundToOneDecimal(adjustedTotalDays)}
              suffix="人天"
              precision={1}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="预计基础成本"
              value={estimatedCostWan}
              suffix="万元"
              precision={2}
            />
          </Col>
        </Row>

        <Table<API.IotPointIntegrationItem>
          rowKey="key"
          columns={columns}
          dataSource={generatedItems}
          pagination={false}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Card title="报价说明" size="small">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="报价归类">
            IoT 点位对接独立报价
          </Descriptions.Item>
          <Descriptions.Item label="工作量模型">
            {IOT_MODULE_NAME}
          </Descriptions.Item>
          <Descriptions.Item label="最近应用时间">
            {iotValue.applied_at
              ? new Date(iotValue.applied_at).toLocaleString('zh-CN')
              : '未应用'}
          </Descriptions.Item>
        </Descriptions>
        <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0' }}>
          确认后的工作包会作为 IoT
          点位对接独立报价参与总览计算；不会合入系统对接工作量。规模参数、调整后人天、角色或调整说明变化后需重新确认，最终报价仍会叠加当前项目风险评分因子。
        </Typography.Paragraph>
      </Card>
    </Space>
  );
};

export default IotPointIntegrationEstimator;
