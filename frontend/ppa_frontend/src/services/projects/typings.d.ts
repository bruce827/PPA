/* eslint-disable */

declare namespace API {
  type BusinessPricingMode = 'custom_development' | 'enterprise_product';

  /** 项目信息 */
  type ProjectInfo = {
    id: number;
    name: string;
    description?: string;
    is_template?: number | boolean;
    final_total_cost: number;
    final_risk_score: number;
    final_workload_days?: number;
    has_business_quote?: number | boolean;
    business_quote_json?: string;
    created_at?: string;
    updated_at?: string;
    // 详细数据字段
    project_data?: any;
  };

  type BusinessQuoteSnapshot = {
    project_id: number;
    project_name: string;
    pricing_mode: BusinessPricingMode;
    pricing_mode_label?: string;
    base_cost_wan: number;
    rates: BusinessPricingConfig | EnterpriseProductPricingConfig;
    amounts: {
      management_fee_wan?: number;
      sales_fee_wan?: number;
      profit_fee_wan?: number;
      subtotal_before_tax_wan?: number;
      tax_fee_wan?: number;
      rd_cost_wan?: number;
      cac_cost_wan?: number;
      cogs_cost_wan?: number;
      csm_cost_wan?: number;
      variable_cost_share_rate?: number;
      non_variable_cost_wan?: number;
      quote_total_wan: number;
      gross_profit_wan?: number;
      gross_margin_rate?: number;
    };
    remark?: string;
    updated_at: string;
  };

  type BusinessQuoteContext = {
    project_id: number;
    project_name: string;
    base_cost_wan: number;
    default_pricing_mode: BusinessPricingMode;
    default_rates: BusinessPricingConfig;
    default_rates_by_mode: BusinessPricingSettings;
    business_quote: BusinessQuoteSnapshot | null;
  };

  type BusinessQuoteFormValues = {
    pricing_mode: BusinessPricingMode;
    tax_rate?: number;
    management_rate?: number;
    sales_rate?: number;
    profit_rate?: number;
    rd_rate?: number;
    cac_rate?: number;
    cogs_rate?: number;
    csm_rate?: number;
    remark?: string;
  };

  /** 项目列表响应 */
  type ProjectListResponse = {
    data: ProjectInfo[];
    success: boolean;
  };

  /** 项目详情响应 */
  type ProjectDetailResponse = {
    data: ProjectInfo;
    success: boolean;
  };

  /** 删除项目响应 */
  type DeleteProjectResponse = {
    success: boolean;
  };
}
