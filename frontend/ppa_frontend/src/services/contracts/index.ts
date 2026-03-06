/* eslint-disable */
import { request } from '@umijs/max';

export interface ContractFileInfo {
  name: string;
  size: number;
  modified_at: string | null;
}

export interface ContractsFilesResponse {
  files: ContractFileInfo[];
}

export interface ContractsFileData {
  columns: string[];
  rows: Array<Record<string, string>>;
  meta: {
    total_rows: number;
    matched_rows: number;
    returned_rows: number;
    truncated: boolean;
    header_row_index: number;
  };
}

export interface ContractsRecommendItem {
  file: string;
  score: number;
  matched_tags: string[];
  matched_fields: Record<string, string[]>;
  row: Record<string, string>;
  row_index?: number;
}

export async function listContractFiles(options?: { [key: string]: any }) {
  return request<{ success: boolean; data: ContractsFilesResponse }>(
    '/api/contracts/files',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function readContractFile(
  params: { name: string; search?: string; maxRows?: number },
  options?: { [key: string]: any },
) {
  return request<{ success: boolean; data: ContractsFileData }>(
    '/api/contracts/file',
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
}

export interface ContractsRecommendResponse {
  items: ContractsRecommendItem[];
  meta: {
    top_n: number;
    tags_count: number;
    files_scanned: number;
    rows_scanned: number;
  };
}

export async function recommendContracts(
  data: { tags: string[]; topN?: number; maxRowsPerFile?: number },
  options?: { [key: string]: any },
) {
  return request<{ success: boolean; data: ContractsRecommendResponse }>(
    '/api/contracts/recommend',
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
