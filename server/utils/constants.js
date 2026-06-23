// 常量定义

// 默认值
const DEFAULTS = {
  TRAVEL_COST_PER_MONTH: 10800, // 元/人/月
  MAINTENANCE_DAILY_COST: 1600, // 元/人/天
  WORK_DAYS_PER_MONTH: 21.5, // 每月工作天数
  AVERAGE_UNIT_PRICE: 0.16 // 平均单价（万元）
};

const RISK = {
  DEFAULT_MAX_SCORE: 100,
  BASE_THRESHOLD_RATIO: 0.7,
  MID_THRESHOLD_RATIO: 1.0,
  PEAK_THRESHOLD_RATIO: 1.2,
  MID_FACTOR: 1.2,
  FACTOR_CAP: 1.5,
  LEVEL_THRESHOLDS: {
    LOW: 0.4,
    HIGH: 0.7
  }
};

const BUSINESS_PRICING = {
  CUSTOM_DEVELOPMENT: {
    tax_rate: { label: '税率', min: 6, max: 13, defaultValue: 6 },
    management_rate: { label: '管理分摊率', min: 10, max: 15, defaultValue: 12 },
    sales_rate: { label: '销售商务率', min: 10, max: 15, defaultValue: 12 },
    profit_rate: { label: '利润率', min: 10, max: 20, defaultValue: 15 }
  },
  ENTERPRISE_PRODUCT: {
    rd_rate: { label: '研发成本（R&D）', min: 30, max: 40, defaultValue: 35 },
    cac_rate: { label: '营销与获客成本（CAC）', min: 30, max: 50, defaultValue: 40 },
    cogs_rate: { label: '基础设施成本（COGS）', min: 10, max: 20, defaultValue: 15 },
    csm_rate: { label: '客户成功与运维（CSM）', min: 10, max: 15, defaultValue: 10 }
  }
};

module.exports = {
  DEFAULTS,
  RISK,
  BUSINESS_PRICING
};
