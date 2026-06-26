/**
 * Entity schemas derived 1:1 from the SQLite table definitions in
 * `init-db.js` and `migrations/`. These describe the row shapes returned by
 * the data layer and are the building blocks for per-endpoint response
 * contracts. SQLite stores booleans as 0/1 integers and returns them as
 * numbers, so flag columns are modelled with `Flag`.
 *
 * Single source of truth: the same schemas back both the OpenAPI document and
 * (where wired) the runtime `validate()` middleware.
 */
const { z } = require('zod');
require('../openapi/registry'); // ensure extendZodWithOpenApi has run

// SQLite integer-boolean flag (0/1). Tolerates real booleans for handlers that
// normalise before responding.
const Flag = z.union([z.number().int(), z.boolean()]);
const ts = () => z.string(); // DATETIME serialised as ISO-ish string
const nstr = () => z.string().nullable();
const nnum = () => z.number().nullable();

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------
const Project = z
  .object({
    id: z.number().int(),
    name: z.string(),
    description: nstr(),
    is_template: Flag,
    project_type: z.string().nullable(),
    final_total_cost: nnum(),
    final_risk_score: nnum(),
    final_workload_days: nnum(),
    assessment_details_json: nstr(),
    tags_json: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('Project');

// ---------------------------------------------------------------------------
// config_*
// ---------------------------------------------------------------------------
const Role = z
  .object({
    id: z.number().int(),
    role_name: z.string(),
    unit_price: z.number(),
    is_active: Flag,
  })
  .openapi('Role');

const RiskItem = z
  .object({
    id: z.number().int(),
    category: z.string(),
    item_name: z.string(),
    options_json: z.string(),
    is_active: Flag,
  })
  .openapi('RiskItem');

const TravelCost = z
  .object({
    id: z.number().int(),
    item_name: z.string(),
    cost_per_month: z.number(),
    is_active: Flag,
  })
  .openapi('TravelCost');

const BusinessPricing = z
  .object({
    id: z.number().int(),
    tax_rate: z.number(),
    management_rate: z.number(),
    sales_rate: z.number(),
    profit_rate: z.number(),
    rd_rate: z.number(),
    cac_rate: z.number(),
    cogs_rate: z.number(),
    csm_rate: z.number(),
    updated_at: ts(),
  })
  .openapi('BusinessPricing');

// ---------------------------------------------------------------------------
// prompt_templates / prompt_module_tags
// ---------------------------------------------------------------------------
const PromptTemplate = z
  .object({
    id: z.number().int(),
    template_name: z.string(),
    module_tag: z.string(),
    description: nstr(),
    system_prompt: z.string(),
    user_prompt_template: z.string(),
    variables_json: nstr(),
    is_system: Flag,
    is_active: Flag,
    is_current: Flag,
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('PromptTemplate');

const PromptModuleTag = z
  .object({
    id: z.number().int(),
    value: z.string(),
    label: z.string(),
    description: nstr(),
    is_recommended: Flag,
    sort_order: z.number().int(),
    created_at: ts().optional(),
    updated_at: ts().optional(),
  })
  .openapi('PromptModuleTag');

// ---------------------------------------------------------------------------
// ai_model_configs / ai_prompts / ai_assessment_logs
// ---------------------------------------------------------------------------
const AIModelConfig = z
  .object({
    id: z.number().int(),
    config_name: z.string(),
    description: nstr(),
    provider: z.string(),
    api_key: z.string(),
    api_host: z.string(),
    model_name: z.string(),
    temperature: z.number(),
    max_tokens: z.number().int(),
    timeout: z.number().int(),
    is_current: Flag,
    is_current_vision: Flag,
    is_active: Flag,
    supports_web_search: Flag,
    supports_vision: Flag,
    last_test_time: nstr(),
    test_status: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('AIModelConfig');

const AIPrompt = z
  .object({
    id: z.string(),
    name: z.string(),
    description: nstr(),
    content: z.string(),
    variables_json: nstr(),
    model_hint: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('AIPrompt');

const AssessmentLog = z
  .object({
    id: z.number().int(),
    prompt_id: nstr(),
    model_used: nstr(),
    request_hash: nstr(),
    duration_ms: nnum(),
    status: z.string(),
    error_message: nstr(),
    created_at: ts(),
  })
  .openapi('AssessmentLog');

// ---------------------------------------------------------------------------
// web3d_*
// ---------------------------------------------------------------------------
const Web3dRiskItem = z
  .object({
    id: z.number().int(),
    step_order: z.number().int(),
    step_name: z.string(),
    item_name: z.string(),
    description: nstr(),
    weight: nnum(),
    options_json: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('Web3dRiskItem');

const Web3dWorkloadTemplate = z
  .object({
    id: z.number().int(),
    category: z.string(),
    item_name: z.string(),
    description: nstr(),
    base_days: z.number(),
    unit: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('Web3dWorkloadTemplate');

// ---------------------------------------------------------------------------
// opportunity_*
// ---------------------------------------------------------------------------
const BiddingSite = z
  .object({
    id: z.number().int(),
    name: z.string(),
    alias_name: nstr(),
    url: z.string(),
    normalized_url: z.string(),
    source_level: nstr(),
    province: nstr(),
    city: nstr(),
    platform_type: nstr(),
    is_official: Flag,
    enabled: Flag,
    notes: nstr(),
    validation_status: z.string(),
    validation_summary: nstr(),
    auth_required: Flag.nullable(),
    is_bidding_site: Flag.nullable(),
    http_status: nnum(),
    final_url: nstr(),
    redirect_chain_json: nstr(),
    validation_confidence: nnum(),
    validation_payload_json: nstr(),
    last_validated_at: nstr(),
    has_script: Flag,
    script_filename: nstr(),
    script_uploaded_at: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('BiddingSite');

const TenderStaging = z
  .object({
    id: z.number().int(),
    source_item_id: z.string(),
    source_origin_id: nstr(),
    source_record_id: nstr(),
    title: z.string(),
    notice_type: nstr(),
    published_at: nstr(),
    published_date: nstr(),
    deadline_at: nstr(),
    deadline_date: nstr(),
    issuer: nstr(),
    budget_amount: nstr(),
    region: nstr(),
    source_platform: nstr(),
    source_url: nstr(),
    summary: nstr(),
    detail_excerpt: nstr(),
    announcement_html: nstr(),
    announcement_plain_text: nstr(),
    detail_payload_json: nstr(),
    source_file: nstr(),
    raw_payload_json: nstr(),
    push_status: z.string(),
    push_error: nstr(),
    last_synced_at: nstr(),
    pushed_at: nstr(),
    last_parsed_at: nstr(),
    parse_status: z.string(),
    parse_error: nstr(),
    parse_meta_json: nstr(),
    deleted_at: nstr(),
    delete_reason: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('TenderStaging');

// ---------------------------------------------------------------------------
// form_*
// ---------------------------------------------------------------------------
const FormProject = z
  .object({
    id: z.number().int(),
    project_name: z.string(),
    project_desc: nstr(),
    linked_project_id: nnum(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('FormProject');

const FormApp = z
  .object({
    id: z.number().int(),
    app_name: z.string(),
    app_code: z.string(),
    project_id: nnum(),
    description: nstr(),
    sort_order: z.number().int(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('FormApp');

const FormDefinition = z
  .object({
    id: z.number().int(),
    app_id: z.number().int(),
    form_name: z.string(),
    form_code: z.string(),
    filter_condition: nstr(),
    description: nstr(),
    sort_order: z.number().int(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('FormDefinition');

const FormField = z
  .object({
    id: z.number().int(),
    form_id: z.number().int(),
    field_name: z.string(),
    field_code: z.string(),
    is_primary_key: Flag,
    is_virtual: Flag,
    field_type: nstr(),
    field_length: nnum(),
    field_precision: nnum(),
    default_value: nstr(),
    input_type: nstr(),
    input_type_code: nstr(),
    input_component: nstr(),
    input_params: nstr(),
    is_required: Flag,
    is_unique: Flag,
    placeholder: nstr(),
    remark: nstr(),
    card_group: nstr(),
    card_sort: nnum(),
    card_width: nstr(),
    card_width_span: nnum(),
    add_control: nstr(),
    update_control: nstr(),
    detail_control: nstr(),
    list_width: nnum(),
    list_control: nstr(),
    list_sort: nnum(),
    list_formatter: nstr(),
    is_filter: Flag,
    filter_mode: nstr(),
    filter_default: nstr(),
    filter_placeholder: nstr(),
    source_system: nstr(),
    sort_order: z.number().int(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('FormField');

// ---------------------------------------------------------------------------
// data_metrics_*
// ---------------------------------------------------------------------------
const DataMetricsProject = z
  .object({
    id: z.number().int(),
    project_name: z.string(),
    project_desc: nstr(),
    linked_project_id: nnum(),
    metric_count: z.number().int(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('DataMetricsProject');

const DataMetric = z
  .object({
    id: z.number().int(),
    dm_project_id: nnum(),
    application: nstr(),
    module_name: z.string(),
    scene_l1: z.string(),
    scene_l2: z.string(),
    metric_name: z.string(),
    display_type: z.string(),
    data_source_logic: nstr(),
    algorithm: nstr(),
    collection_cycle: nstr(),
    source_system: nstr(),
    source_module: nstr(),
    integration_method: nstr(),
    remark: nstr(),
    created_at: ts(),
    updated_at: ts(),
  })
  .openapi('DataMetric');

const DataMetricCategory = z
  .object({
    id: z.number().int(),
    dm_project_id: nnum(),
    type: z.string(),
    name: z.string(),
    parent_id: nnum(),
    sort_order: z.number().int(),
    created_at: ts(),
  })
  .openapi('DataMetricCategory');

// ---------------------------------------------------------------------------
// wiki_project_relations / project_push_records
// ---------------------------------------------------------------------------
const WikiRelation = z
  .object({
    id: z.number().int(),
    wiki_key: z.string(),
    project_id: z.number().int(),
    created_at: ts(),
  })
  .openapi('WikiRelation');

const PushRecord = z
  .object({
    id: z.number().int(),
    project_id: z.number().int(),
    project_name: z.string(),
    project_description: nstr(),
    our_quote: nnum(),
    customer_budget: nnum(),
    budget_difference: nnum(),
    cost_breakdown_json: nstr(),
    risk_total_score: nnum(),
    risk_level: nstr(),
    total_workload_days: nnum(),
    new_dev_workload_days: nnum(),
    travel_cost_total: nnum(),
    top3_risk_scores: nstr(),
    attachment_file_ids: nstr(),
    push_time: z.string(),
    push_status: z.string(),
    push_error: nstr(),
    created_at: ts(),
  })
  .openapi('PushRecord');

module.exports = {
  Flag,
  Project,
  Role,
  RiskItem,
  TravelCost,
  BusinessPricing,
  PromptTemplate,
  PromptModuleTag,
  AIModelConfig,
  AIPrompt,
  AssessmentLog,
  Web3dRiskItem,
  Web3dWorkloadTemplate,
  BiddingSite,
  TenderStaging,
  FormProject,
  FormApp,
  FormDefinition,
  FormField,
  DataMetricsProject,
  DataMetric,
  DataMetricCategory,
  WikiRelation,
  PushRecord,
};
