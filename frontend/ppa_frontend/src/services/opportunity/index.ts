/* eslint-disable */
import { request } from '@umijs/max';

export async function getBiddingSites(
  params?: Record<string, any>,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.BiddingSiteListResponse>(
    '/api/opportunity/bidding-sites',
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
}

export async function getBiddingSite(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.BiddingSiteResponse>(
    `/api/opportunity/bidding-sites/${id}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function createBiddingSite(
  data: API_OPPORTUNITY.BiddingSitePayload,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.BiddingSiteResponse>(
    '/api/opportunity/bidding-sites',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

export async function updateBiddingSite(
  id: number | string,
  data: API_OPPORTUNITY.BiddingSitePayload,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.BiddingSiteResponse>(
    `/api/opportunity/bidding-sites/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

export async function deleteBiddingSite(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<{ success: boolean; data: { id: number } }>(
    `/api/opportunity/bidding-sites/${id}`,
    {
      method: 'DELETE',
      ...(options || {}),
    },
  );
}

export async function validateBiddingSite(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.BiddingSiteValidationResponse>(
    `/api/opportunity/bidding-sites/${id}/validate`,
    {
      method: 'POST',
      ...(options || {}),
    },
  );
}

export async function uploadBiddingSiteScript(
  id: number | string,
  fileName: string,
  fileContent: string,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.BiddingSiteScriptUploadResponse>(
    `/api/opportunity/bidding-sites/${id}/script`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-Script-Filename': encodeURIComponent(fileName),
      },
      data: fileContent,
      ...(options || {}),
    },
  );
}

export async function listTenderStaging(
  params?: Record<string, any>,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderStagingListResponse>(
    '/api/opportunity/tender-staging',
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
}

export async function syncTenderStaging(
  data?: { directoryPath?: string; pruneMissing?: boolean },
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderStagingSyncResponse>(
    '/api/opportunity/tender-staging/sync',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

export async function cleanupTenderStaging(
  data: { publishedDateBefore?: string; createdAtBefore?: string; statusFilter?: 'all' | 'processed_only' },
  options?: { [key: string]: any },
) {
  return request<{ success: boolean; data: { deletedCount: number } }>(
    '/api/opportunity/tender-staging/cleanup',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

export async function archiveTenderSourceFiles(
  data?: { directoryPath?: string },
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderSourceArchiveResponse>(
    '/api/opportunity/tender-staging/archive-source-files',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

export async function previewTenderDedupe(options?: { [key: string]: any }) {
  return request<API_OPPORTUNITY.TenderDedupePreviewResponse>(
    '/api/opportunity/tender-staging/dedupe/preview',
    {
      method: 'POST',
      ...(options || {}),
    },
  );
}

export async function executeTenderDedupe(
  data?: { group_keys?: string[] },
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderDedupeExecuteResponse>(
    '/api/opportunity/tender-staging/dedupe/execute',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

export async function pushTenderStaging(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderStagingPushResponse>(
    `/api/opportunity/tender-staging/${id}/push`,
    {
      method: 'POST',
      ...(options || {}),
    },
  );
}

export async function parseTenderStagingFields(
  id: number | string,
  data: API_OPPORTUNITY.TenderStagingParsePayload,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderStagingParseResponse>(
    `/api/opportunity/tender-staging/${id}/parse-fields`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

export async function getTenderWebSearch(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderWebSearchResponse>(
    `/api/opportunity/tender-staging/${id}/web-search`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function searchTenderWebSearch(
  id: number | string,
  data: API_OPPORTUNITY.TenderWebSearchExecutePayload,
  options?: { [key: string]: any },
) {
  return request<API_OPPORTUNITY.TenderWebSearchExecuteResponse>(
    `/api/opportunity/tender-staging/${id}/web-search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}
