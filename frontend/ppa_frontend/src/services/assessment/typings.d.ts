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
    travel_cost: number;
    maintenance_cost: number;
    risk_cost: number;
    total_cost_exact: number;
    total_cost: number;
    software_dev_workload_days: number;
    system_integration_workload_days: number;
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
