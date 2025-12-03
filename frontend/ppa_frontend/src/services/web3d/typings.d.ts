/* eslint-disable */

declare namespace API_WEB3D {
  type RiskItem = {
    id: number;
    step_order: number;
    step_name: string;
    item_name: string;
    description?: string;
    weight: number;
    options_json: string;
  };

  type WorkloadTemplate = {
    id: number;
    category: string;
    item_name: string;
    description?: string;
    base_days: number;
    unit?: string;
  };

  type RiskSelection = {
    item_name?: string;
    item_id?: number;
    selected_value?: number;
    label?: string;
  };

  type WorkloadItem = {
    category: string;
    item_name: string;
    quantity?: number;
    base_days?: number;
    unit?: string;
    role_name?: string;
    role_names?: string[];
    unit_price_yuan?: number;
  };

  type Assessment = {
    risk_selections?: RiskSelection[];
    workload_items?: WorkloadItem[];
    risk_factor?: number;
    risk_factor_extra?: number;
    mix_tech?: boolean;
  };

  type Project = {
    id: number;
    name: string;
    description?: string;
    is_template?: number;
    project_type: string;
    final_total_cost: number;
    final_risk_score: number;
    final_workload_days: number;
    assessment_details_json: string;
    created_at: string;
    updated_at: string;
  };

  type CalculationResult = {
    risk_score: number;
    risk_max_score: number;
    risk_ratio: number;
    risk_level: string;
    risk_factor: number;
    workload: {
      data_processing_days: number;
      core_dev_days: number;
      business_logic_days: number;
      total_base_days: number;
      total_days: number;
      items: Array<{
        category: string;
        item_name: string;
      base_days: number;
      quantity: number;
      subtotal_days: number;
      role_name?: string;
      role_names?: string[];
      unit_price_yuan?: number;
      subtotal_cost_wan?: number;
      unit?: string;
    }>;
    };
    cost: {
      total_cost_wan: number;
      base_cost_wan: number;
      roles?: any[];
    };
  };
}
