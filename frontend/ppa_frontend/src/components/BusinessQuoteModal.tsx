import {
  BUSINESS_PRICING_FIELD_CONFIGS_BY_MODE,
  BUSINESS_PRICING_MODE_OPTIONS,
  ENTERPRISE_PRODUCT_RATE_TOTAL,
  calculateEnterpriseProductRateTotal,
  getBusinessPricingModeLabel,
  normalizeBusinessPricingValues,
  normalizeEnterpriseProductPricingValues,
} from '@/constants/businessPricing';
import {
  getProjectBusinessQuote,
  saveProjectBusinessQuote,
} from '@/services/projects';
import {
  App,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Spin,
  Statistic,
  Tooltip,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';

type BusinessQuoteModalProps = {
  open: boolean;
  projectId?: number;
  projectName?: string;
  onCancel: () => void;
  onSuccess?: (snapshot: API.BusinessQuoteSnapshot) => void;
};

type QuoteFormValues = API.BusinessQuoteFormValues;

const calculatePreview = (
  pricingMode: API.BusinessPricingMode,
  baseCostWan: number,
  values: Partial<QuoteFormValues>,
) => {
  if (pricingMode === 'enterprise_product') {
    const rdRate = Number(values.rd_rate || 0) / 100;
    const cacRate = Number(values.cac_rate || 0) / 100;
    const cogsRate = Number(values.cogs_rate || 0) / 100;
    const csmRate = Number(values.csm_rate || 0) / 100;

    const variableShareRate = cogsRate + csmRate;
    const quoteTotal =
      variableShareRate > 0 ? baseCostWan / variableShareRate : 0;
    const rdCost = quoteTotal * rdRate;
    const cacCost = quoteTotal * cacRate;
    const cogsCost = quoteTotal * cogsRate;
    const csmCost = quoteTotal * csmRate;

	    return {
	      cards: [
	        { title: '研发成本（R&D）', value: rdCost },
	        { title: '营销与获客成本（CAC）', value: cacCost },
	        { title: '基础设施成本（COGS）', value: cogsCost },
	        { title: '客户成功与运维（CSM）', value: csmCost },
	        {
	          title: '总商业成本池',
	          value: quoteTotal,
	          valueStyle: { color: '#cf1322' as const },
        },
      ],
    };
  }

  const taxRate = Number(values.tax_rate || 0) / 100;
  const managementRate = Number(values.management_rate || 0) / 100;
  const salesRate = Number(values.sales_rate || 0) / 100;
  const profitRate = Number(values.profit_rate || 0) / 100;

  const managementFee = baseCostWan * managementRate;
  const salesFee = baseCostWan * salesRate;
  const profitFee = baseCostWan * profitRate;
  const subtotalBeforeTax = baseCostWan + managementFee + salesFee + profitFee;
  const taxFee = subtotalBeforeTax * taxRate;
  const quoteTotal = subtotalBeforeTax + taxFee;

  return {
    cards: [
      { title: '管理分摊', value: managementFee },
      { title: '销售商务', value: salesFee },
      { title: '税费', value: taxFee },
      {
        title: '商务报价总计',
        value: quoteTotal,
        valueStyle: { color: '#cf1322' as const },
      },
    ],
  };
};

const normalizePricingMode = (
  mode?: string,
): API.BusinessPricingMode => {
  return mode === 'enterprise_product'
    ? 'enterprise_product'
    : 'custom_development';
};

const extractRequestErrorMessage = (error: any, fallback: string) => {
  return (
    error?.info?.data?.message ||
    error?.info?.message ||
    error?.message ||
    fallback
  );
};

const getNormalizedRatesByMode = (
  pricingMode: API.BusinessPricingMode,
  input?: Partial<QuoteFormValues> | API.BusinessPricingConfig | API.EnterpriseProductPricingConfig,
) => {
  if (pricingMode === 'enterprise_product') {
    return normalizeEnterpriseProductPricingValues(
      input as Partial<API.EnterpriseProductPricingConfig>,
    );
  }
  return normalizeBusinessPricingValues(
    input as Partial<API.BusinessPricingConfig>,
  );
};

const validateQuoteValues = (
  pricingMode: API.BusinessPricingMode,
  values: Partial<QuoteFormValues>,
) => {
  if (pricingMode !== 'enterprise_product') {
    return;
  }
  const total = calculateEnterpriseProductRateTotal(values);
  if (Math.abs(total - ENTERPRISE_PRODUCT_RATE_TOTAL) > 0.001) {
    throw new Error(`企业级产品成本结构合计必须为 ${ENTERPRISE_PRODUCT_RATE_TOTAL}%`);
  }
};

const QuoteFormFields = ({
  pricingMode,
}: {
  pricingMode: API.BusinessPricingMode;
}) => {
  return (
    <Row gutter={[24, 12]}>
      {BUSINESS_PRICING_FIELD_CONFIGS_BY_MODE[pricingMode].map((field) => (
        <Col key={field.name} xs={24} md={12}>
          <Form.Item
            name={field.name}
            label={field.label}
            extra={`建议区间：${field.min}% - ${field.max}%`}
            rules={[{ required: true, message: `请输入${field.label}` }]}
          >
            <InputNumber
              min={field.min}
              max={field.max}
              addonAfter="%"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      ))}
      <Col span={24}>
        <Form.Item name="remark" label="报价备注">
          <Input.TextArea rows={3} placeholder="可填写报价说明、商务备注等" />
        </Form.Item>
      </Col>
    </Row>
  );
};

const BusinessQuoteModal = ({
  open,
  projectId,
  projectName,
  onCancel,
  onSuccess,
}: BusinessQuoteModalProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<QuoteFormValues>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<API.BusinessQuoteContext | null>(null);
  const watchedValues = Form.useWatch([], form) as Partial<QuoteFormValues> | undefined;
  const watchedPricingMode = normalizePricingMode(
    Form.useWatch('pricing_mode', form),
  );

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }

    const loadContext = async () => {
      try {
        setLoading(true);
        const res = await getProjectBusinessQuote(projectId);
        const nextContext = res?.data || null;
        setContext(nextContext);

        const initialPricingMode = normalizePricingMode(
          nextContext?.business_quote?.pricing_mode ||
            nextContext?.default_pricing_mode,
        );
        const initialRates =
          nextContext?.business_quote?.rates ||
          nextContext?.default_rates_by_mode?.[initialPricingMode] ||
          nextContext?.default_rates;
        form.setFieldsValue({
          pricing_mode: initialPricingMode,
          ...getNormalizedRatesByMode(initialPricingMode, initialRates),
          remark: nextContext?.business_quote?.remark || '',
        });
      } catch (error: any) {
        message.error(extractRequestErrorMessage(error, '加载商务报价信息失败'));
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, [open, projectId, form, message]);

  const preview = useMemo(() => {
    const baseCostWan = Number(context?.base_cost_wan || 0);
    return calculatePreview(
      watchedPricingMode,
      baseCostWan,
      watchedValues || {},
    );
  }, [context?.base_cost_wan, watchedPricingMode, watchedValues]);

  const handleSubmit = async () => {
    if (!projectId) return;

    try {
      const values = await form.validateFields();
      setSaving(true);
      const pricingMode = normalizePricingMode(values.pricing_mode);
      validateQuoteValues(pricingMode, values);
      const res = await saveProjectBusinessQuote(projectId, {
        pricing_mode: pricingMode,
        ...getNormalizedRatesByMode(pricingMode, values),
        remark: values.remark,
      });
      const snapshot = res?.data;
      if (snapshot) {
        message.success('商务报价已保存');
        onSuccess?.(snapshot);
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(extractRequestErrorMessage(error, '保存商务报价失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`商务报价${projectName ? ` - ${projectName}` : ''}`}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={saving}
      width={760}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin />
        </div>
      ) : (
        <>
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="项目名称" span={2}>
              {context?.project_name || projectName || '—'}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                watchedPricingMode === 'enterprise_product'
                  ? (
                      <span style={{ fontWeight: 600 }}>
                        单客户实施基线{' '}
                        <Tooltip
                          title="企业级产品模式下，原评估结果代表的是单个客户实施交付所需的直接成本。这里先把它当作单客户实施基线，再按基础设施成本（COGS）和客户成功与运维（CSM）的占比反推总商业成本池。"
                        >
                          <InfoCircleOutlined style={{ color: '#999' }} />
                        </Tooltip>
                      </span>
                    )
                  : '实施成本'
              }
            >
              {Number(context?.base_cost_wan || 0).toFixed(2)} 万元
            </Descriptions.Item>
            <Descriptions.Item label="默认模式">
              {getBusinessPricingModeLabel(context?.default_pricing_mode)}
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              {context?.business_quote ? '已生成商务报价' : '未生成商务报价'}
            </Descriptions.Item>
            {context?.business_quote?.pricing_mode_label ? (
              <Descriptions.Item label="当前报价模式">
                {context.business_quote.pricing_mode_label}
              </Descriptions.Item>
            ) : null}
            {context?.business_quote?.updated_at ? (
              <Descriptions.Item label="最近报价时间" span={2}>
                {new Date(context.business_quote.updated_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Form
            form={form}
            layout="vertical"
            onValuesChange={(changedValues) => {
              if (!Object.prototype.hasOwnProperty.call(changedValues, 'pricing_mode')) {
                return;
              }
              const nextMode = normalizePricingMode(changedValues.pricing_mode);
              const nextRates = getNormalizedRatesByMode(
                nextMode,
                context?.default_rates_by_mode?.[nextMode],
              );
              form.setFieldsValue(nextRates);
            }}
          >
            <Form.Item
              name="pricing_mode"
              label="报价模式"
              rules={[{ required: true, message: '请选择报价模式' }]}
            >
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={BUSINESS_PRICING_MODE_OPTIONS}
              />
            </Form.Item>
            {watchedPricingMode === 'enterprise_product' ? (
              <Descriptions
                bordered
                size="small"
                column={1}
                style={{ marginBottom: 16 }}
              >
	                <Descriptions.Item label="企业级产品口径说明">
	                  当前会将项目评估得到的实施成本视为“单客户实施基线”，按
	                  基础设施成本（COGS） + 客户成功与运维（CSM）的占比反推总商业成本池。四项占比合计必须为 100%。
	                </Descriptions.Item>
	              </Descriptions>
	            ) : null}
            <QuoteFormFields pricingMode={watchedPricingMode} />
          </Form>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
              marginTop: 8,
            }}
          >
            {preview.cards.map((card) => (
              <Statistic
                key={card.title}
                title={card.title}
                value={card.value}
                precision={2}
                suffix="万"
                valueStyle={card.valueStyle}
              />
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

export default BusinessQuoteModal;
