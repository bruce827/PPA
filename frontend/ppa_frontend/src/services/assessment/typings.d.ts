/* eslint-disable */

declare namespace API {
  /** 角色配置 */
  type RoleConfig = {
    id: number;
    role_name: string;
    unit_price: number;
  };

  /** 风险评估项配置 */
  type RiskItemConfig = {
    id: number;
    category: string;
    item_name: string;
    options_json: string;
  };

  /** 评估风险项 */
  type AssessmentRiskCostItem = {
    id?: string | number;
    /**
     * 风险成本描述
     * @deprecated content/description 只保留一个字段，后端读取 description 优先
     */
    content?: string;
    description?: string;
    cost: number;
  };

  /** 工作量记录 */
  type WorkloadRecord = {
    id: string;
    module1?: string;
    module2?: string;
    module3?: string;
    description?: string;
    delivery_factor?: number;
    workload?: number;
    [roleName: string]: string | number | undefined;
  };

  type IotPointIntegrationScaleParams = {
    point_count?: number;
    device_count?: number;
    site_count: number;
    gateway_count: number;
    protocol_type_count: number;
    has_private_protocol: boolean;
    control_point_count: number;
    alarm_point_count: number;
    alarm_rule_count: number;
    high_frequency_point_count: number;
    data_cleaning_point_count: number;
    computed_point_count: number;
    historical_storage_point_count: number;
    need_onsite_debug: boolean;
    onsite_debug_times: number;
    acceptance_sample_ratio: number;
    site_scale_note?: string;
  };

  type IotPointIntegrationItem = {
    key: string;
    package_name: string;
    estimate_basis: string;
    suggested_days: number;
    adjusted_days: number;
    role_name: string;
    adjustment_note?: string;
  };

  type IotPointIntegration = {
    assumptions: {
      has_iot_platform: boolean;
      includes_platform_build: boolean;
      risk_factor_source: 'standard_assessment';
    };
    scale_params: IotPointIntegrationScaleParams;
    generated_items: IotPointIntegrationItem[];
    estimated_point_count?: number;
    estimated_by_device_count?: boolean;
    applied_at?: string;
  };

  type ExtraRiskItem = {
    description: string;
    score: number;
  };

  /** 评估数据 */
  type AssessmentData = {
    risk_scores: Record<string, number | string | undefined>;
    ai_unmatched_risks?: ExtraRiskItem[];
    custom_risk_items?: ExtraRiskItem[];
    development_workload: WorkloadRecord[];
    integration_workload: WorkloadRecord[];
    travel_months: number;
    travel_headcount?: number;
    maintenance_months: number;
    maintenance_headcount: number;
    maintenance_daily_cost?: number;
    risk_cost_items: AssessmentRiskCostItem[];
    iot_point_integration?: IotPointIntegration;
    roles?: RoleConfig[];
  };

  /** 项目信息 */
  type ProjectInfo = {
    id: number;
    name: string;
    description?: string;
    is_template: number;
    final_total_cost: number;
    final_risk_score: number;
    final_workload_days: number;
    assessment_details_json: string;
    business_quote_json?: string;
    has_business_quote?: number | boolean;
    created_at: string;
    updated_at: string;
  };

  /** 计算参数 */
  type CalculateParams = AssessmentData & {
    roles: RoleConfig[];
  };

  /** 计算结果 */
  type CalculationResult = {
    software_dev_cost: number;
    system_integration_cost: number;
    iot_point_integration_cost: number;
    travel_cost: number;
    maintenance_cost: number;
    risk_cost: number;
    total_cost_exact: number;
    total_cost: number;
    software_dev_workload_days: number;
    system_integration_workload_days: number;
    iot_point_integration_workload_days: number;
    maintenance_workload_days: number;
    total_workload_days: number;
    risk_score: number;
    rating_factor: number;
    rating_ratio: number;
    risk_max_score: number;
  };

  /** 创建项目参数 */
  type CreateProjectParams = {
    name: string;
    description?: string;
    is_template: boolean;
    assessmentData: AssessmentData;
  };
}
