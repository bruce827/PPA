/* eslint-disable */

declare namespace API_OPPORTUNITY {
  type ValidationStatus =
    | 'never_validated'
    | 'validated_ok'
    | 'validated_warning'
    | 'validated_failed'
    | 'heuristic_only';

  type RedirectItem = {
    url: string;
    status_code?: number;
    location?: string | null;
  };

  type ValidationPayload = {
    site?: Record<string, any>;
    probe?: Record<string, any>;
    heuristic?: Record<string, any>;
    ai?: Record<string, any> | null;
    error?: Record<string, any>;
  };

  type BiddingSite = {
    id: number;
    name: string;
    alias_name?: string | null;
    url: string;
    normalized_url: string;
    source_level?: string | null;
    province?: string | null;
    city?: string | null;
    platform_type?: string | null;
    is_official: boolean;
    enabled: boolean;
    notes?: string | null;
    validation_status: ValidationStatus;
    validation_summary?: string | null;
    auth_required?: boolean | null;
    is_bidding_site?: boolean | null;
    http_status?: number | null;
    final_url?: string | null;
    redirect_chain?: RedirectItem[];
    validation_confidence?: number | null;
    validation_payload?: ValidationPayload | null;
    last_validated_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };

  type BiddingSitePayload = {
    name: string;
    alias_name?: string;
    url: string;
    source_level?: string;
    province?: string;
    city?: string;
    platform_type?: string;
    is_official?: boolean;
    enabled?: boolean;
    notes?: string;
  };

  type BiddingSiteListData = {
    items: BiddingSite[];
    total: number;
    page: number;
    pageSize: number;
  };

  type BiddingSiteListResponse = {
    success: boolean;
    data: BiddingSiteListData;
  };

  type BiddingSiteResponse = {
    success: boolean;
    data: BiddingSite;
  };

  type BiddingSiteValidationResponse = {
    success: boolean;
    data: {
      site: BiddingSite;
      validation: {
        validation_status: ValidationStatus;
        validation_summary?: string | null;
        auth_required?: boolean | null;
        is_bidding_site?: boolean | null;
        http_status?: number | null;
        final_url?: string | null;
        redirect_chain?: RedirectItem[];
        validation_confidence?: number | null;
        validation_payload?: ValidationPayload | null;
        last_validated_at?: string | null;
      };
    };
  };

  type TenderPushStatus = 'pending' | 'pushed' | 'failed';

  type TenderStagingRecord = {
    id: number;
    source_item_id: string;
    title: string;
    published_at?: string | null;
    published_date?: string | null;
    deadline_at?: string | null;
    deadline_date?: string | null;
    issuer?: string | null;
    budget_amount?: string | null;
    region?: string | null;
    source_platform?: string | null;
    source_url?: string | null;
    summary?: string | null;
    announcement_html?: string | null;
    announcement_plain_text?: string | null;
    detail_payload?: Record<string, any> | null;
    raw_payload?: Record<string, any> | null;
    source_file?: string | null;
    push_status: TenderPushStatus;
    push_error?: string | null;
    last_synced_at?: string | null;
    pushed_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };

  type TenderStagingStats = {
    total: number;
    pending: number;
    pushed: number;
    failed: number;
  };

  type TenderStagingListData = {
    items: TenderStagingRecord[];
    total: number;
    page: number;
    pageSize: number;
    stats: TenderStagingStats;
  };

  type TenderStagingListResponse = {
    success: boolean;
    data: TenderStagingListData;
  };

  type TenderStagingSyncSummary = {
    directoryPath: string;
    fileCount: number;
    rawRecordCount: number;
    deduplicatedCount: number;
    created: number;
    updated: number;
    unchanged: number;
    errors: string[];
  };

  type TenderStagingSyncResponse = {
    success: boolean;
    data: TenderStagingSyncSummary;
  };

  type TenderStagingPushResult = {
    record: TenderStagingRecord;
    cloudResult?: Record<string, any> | null;
    error?: string;
  };

  type TenderStagingPushResponse = {
    success: boolean;
    data: TenderStagingPushResult;
  };

  type TenderWebSearchResultItem = {
    site_name: string;
    site_url: string;
    page_title: string;
    content_type: string;
    published_at?: string | null;
    snippet: string;
    relevance_reason: string;
    confidence?: number | null;
  };

  type TenderWebSearchExecutionState = 'fresh_result' | 'empty_result';

  type TenderWebSearchExecutionResult = {
    record_id: number;
    model_id: number;
    prompt_template_id: number;
    searched_at: string;
    state: TenderWebSearchExecutionState;
    summary: string;
    results: TenderWebSearchResultItem[];
    result_count: number;
  };

  type TenderWebSearchState = 'has_saved_result' | 'empty';

  type TenderWebSearchSavedResult = TenderWebSearchExecutionResult;

  type TenderWebSearchData = {
    record: TenderStagingRecord;
    has_saved_result: boolean;
    saved_result: TenderWebSearchSavedResult | null;
    state: TenderWebSearchState;
  };

  type TenderWebSearchDraft = {
    model_id?: number;
    prompt_template_id?: number;
    focus_keywords?: string;
    exclude_keywords?: string;
    max_results: number;
  };

  type TenderWebSearchPreparedRequest = {
    recordId: number;
    modelId: number;
    promptId: number;
    focusKeywords: string;
    excludeKeywords: string;
    maxResults: number;
  };

  type TenderWebSearchExecutePayload = {
    model_id: number;
    prompt_template_id: number;
    focus_keywords?: string;
    exclude_keywords?: string;
    max_results: number;
  };

  type TenderWebSearchResponse = {
    success: boolean;
    data: TenderWebSearchData;
  };

  type TenderWebSearchExecuteResponse = {
    success: boolean;
    data: TenderWebSearchExecutionResult;
  };
}
