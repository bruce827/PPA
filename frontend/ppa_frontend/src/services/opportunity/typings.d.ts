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
}
