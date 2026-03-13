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
