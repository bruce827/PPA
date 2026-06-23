export type BusinessPricingFieldConfig<TName extends string = string> = {
  name: TName;
  label: string;
  configLabel: string;
  min: number;
  max: number;
  defaultValue: number;
  description: string;
};

export type CustomDevelopmentPricingFieldName =
  | 'tax_rate'
  | 'management_rate'
  | 'sales_rate'
  | 'profit_rate';

export type EnterpriseProductPricingFieldName =
  | 'rd_rate'
  | 'cac_rate'
  | 'cogs_rate'
  | 'csm_rate';

export type BusinessPricingMode = 'custom_development' | 'enterprise_product';

export const ENTERPRISE_PRODUCT_RATE_TOTAL = 100;

export const BUSINESS_PRICING_MODE_OPTIONS: Array<{
  label: string;
  value: BusinessPricingMode;
}> = [
  { label: 'B端定制项目', value: 'custom_development' },
  { label: '企业级产品', value: 'enterprise_product' },
];

export const CUSTOM_DEVELOPMENT_PRICING_FIELD_CONFIGS: BusinessPricingFieldConfig<CustomDevelopmentPricingFieldName>[] =
  [
    {
      name: 'tax_rate',
      label: '税率',
      configLabel: '默认税率',
      min: 6,
      max: 13,
      defaultValue: 6,
      description: '刚性税费，建议保持在 6% - 13% 的常见区间内。',
    },
    {
      name: 'management_rate',
      label: '管理分摊率',
      configLabel: '默认管理分摊率',
      min: 10,
      max: 15,
      defaultValue: 12,
      description: '公司后台管理分摊，建议保持在 10% - 15%。',
    },
    {
      name: 'sales_rate',
      label: '销售商务率',
      configLabel: '默认销售商务率',
      min: 10,
      max: 15,
      defaultValue: 12,
      description: '销售攻关和商务陪跑成本，建议保持在 10% - 15%。',
    },
    {
      name: 'profit_rate',
      label: '利润率',
      configLabel: '默认利润率',
      min: 10,
      max: 20,
      defaultValue: 15,
      description: '预期利润空间，建议保持在 10% - 20%。',
    },
  ];

export const ENTERPRISE_PRODUCT_PRICING_FIELD_CONFIGS: BusinessPricingFieldConfig<EnterpriseProductPricingFieldName>[] =
  [
    {
      name: 'rd_rate',
      label: '研发成本（R&D）',
      configLabel: '默认研发成本占比',
      min: 30,
      max: 40,
      defaultValue: 35,
      description: '固定研发投入较高，建议保持在 30% - 40%。',
    },
    {
      name: 'cac_rate',
      label: '营销与获客成本（CAC）',
      configLabel: '默认营销与获客成本占比',
      min: 30,
      max: 50,
      defaultValue: 40,
      description: '市场推广与渠道分销成本，建议保持在 30% - 50%。',
    },
    {
      name: 'cogs_rate',
      label: '基础设施成本（COGS）',
      configLabel: '默认基础设施成本占比',
      min: 10,
      max: 20,
      defaultValue: 15,
      description: '云资源、带宽与第三方调用成本，建议保持在 10% - 20%。',
    },
    {
      name: 'csm_rate',
      label: '客户成功与运维（CSM）',
      configLabel: '默认客户成功与运维成本占比',
      min: 10,
      max: 15,
      defaultValue: 10,
      description: '客户成功与售后运维团队投入，建议保持在 10% - 15%。',
    },
  ];

export const BUSINESS_PRICING_FIELD_CONFIGS =
  CUSTOM_DEVELOPMENT_PRICING_FIELD_CONFIGS;

export const BUSINESS_PRICING_FIELD_CONFIGS_BY_MODE = {
  custom_development: CUSTOM_DEVELOPMENT_PRICING_FIELD_CONFIGS,
  enterprise_product: ENTERPRISE_PRODUCT_PRICING_FIELD_CONFIGS,
} satisfies Record<BusinessPricingMode, BusinessPricingFieldConfig[]>;

export const getBusinessPricingModeLabel = (mode?: string) =>
  mode === 'enterprise_product' ? '企业级产品' : 'B端定制项目';

const clampValue = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const normalizeFieldGroup = <TName extends string>(
  fields: BusinessPricingFieldConfig<TName>[],
  input?: Partial<Record<TName, unknown>>,
) => {
  return fields.reduce(
    (acc, field) => {
      const numeric = Number(input?.[field.name]);
      acc[field.name] = Number.isFinite(numeric)
        ? clampValue(numeric, field.min, field.max)
        : field.defaultValue;
      return acc;
    },
    {} as Record<TName, number>,
  );
};

export const normalizeBusinessPricingValues = (
  input?: Partial<Record<CustomDevelopmentPricingFieldName, unknown>>,
) => {
  return normalizeFieldGroup(CUSTOM_DEVELOPMENT_PRICING_FIELD_CONFIGS, input);
};

export const normalizeEnterpriseProductPricingValues = (
  input?: Partial<Record<EnterpriseProductPricingFieldName, unknown>>,
) => {
  return normalizeFieldGroup(ENTERPRISE_PRODUCT_PRICING_FIELD_CONFIGS, input);
};

export const calculateEnterpriseProductRateTotal = (
  input?: Partial<Record<EnterpriseProductPricingFieldName, unknown>>,
) => {
  const normalized = normalizeEnterpriseProductPricingValues(input);
  return (
    normalized.rd_rate +
    normalized.cac_rate +
    normalized.cogs_rate +
    normalized.csm_rate
  );
};

export const normalizeBusinessPricingSettingsValues = (input?: {
  custom_development?: Partial<Record<CustomDevelopmentPricingFieldName, unknown>>;
  enterprise_product?: Partial<Record<EnterpriseProductPricingFieldName, unknown>>;
}) => {
  return {
    custom_development: normalizeBusinessPricingValues(input?.custom_development),
    enterprise_product: normalizeEnterpriseProductPricingValues(
      input?.enterprise_product,
    ),
  };
};
