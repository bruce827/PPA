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
    reason?: string;
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
        reason?: string;
      }>;
    };
    cost: {
      total_cost_wan: number;
      base_cost_wan: number;
      roles?: any[];
    };
  };

  type Step4PromptVariable = {
    name: string;
    display_name?: string;
    description?: string;
    default_value?: string;
  };

  type Step4Prompt = {
    id: string;
    name: string;
    description?: string;
    content: string;
    variables?: Step4PromptVariable[];
    model_hint?: string;
    updated_at?: string;
  };

  type Step4ContextRiskAnswer = {
    item_id?: number;
    item_name: string;
    step_name?: string;
    description?: string;
    weight?: number;
    selected_value?: number;
    selected_label?: string;
  };

  type Step4AnalyzeContext = {
    project_name?: string;
    project_description?: string;
    step1?: Record<string, any>;
    step2?: Record<string, any>;
    step3?: Record<string, any>;
    risk_summary?: Record<string, any>;
    workload_templates?: WorkloadTemplate[];
    roles?: API.RoleConfig[];
  };

  type Step4AnalyzeCoverageItem = {
    category: string;
    item_name: string;
    applicability: 'required' | 'optional' | 'not_applicable';
    recommended_base_days: number;
    recommended_delivery_factor: number;
    recommended_role_names: string[];
    reason?: string;
  };

  type Step4AnalyzeRow = {
    category: string;
    item_name: string;
    base_days: number;
    delivery_factor: number;
    role_names: string[];
    reason?: string;
  };

  type Step4AnalyzeUnmappedItem = {
    source: 'coverage' | 'step4_rows';
    category: string;
    item_name: string;
    reason?: string;
    failure_reason:
      | 'template_not_found'
      | 'duplicate_item'
      | 'invalid_roles'
      | 'invalid_base_days'
      | 'invalid_delivery_factor';
  };

  type Step4AnalyzeTemplateItem = {
    category: string;
    item_name: string;
  };

  type Step4AnalyzeResult = {
    summary?: string;
    coverage: Step4AnalyzeCoverageItem[];
    step4_rows: Step4AnalyzeRow[];
    unmapped_items?: Step4AnalyzeUnmappedItem[];
    missing_template_items?: Step4AnalyzeTemplateItem[];
    raw_response?: string;
    model_used?: string;
    timestamp?: string;
    duration_ms?: number;
  };
}
