import { request } from '@umijs/max';

/** 上传附件 POST /api/projects/:id/attachments/upload */
export async function uploadAttachment(
  projectId: number,
  file: File,
  options?: { [key: string]: any },
) {
  const formData = new FormData();
  formData.append('file', file);
  return request<{
    success: boolean;
    data: {
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
      uploadedAt: string;
    };
  }>(`/api/projects/${projectId}/attachments/upload`, {
    method: 'POST',
    data: formData,
    ...(options || {}),
  });
}

/** 获取附件列表 GET /api/projects/:id/attachments */
export async function listAttachments(
  projectId: number,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    data: Array<{
      filename: string;
      size: number;
      uploadedAt: string;
    }>;
  }>(`/api/projects/${projectId}/attachments`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 删除附件 DELETE /api/projects/:id/attachments/:filename */
export async function deleteAttachment(
  projectId: number,
  filename: string,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    message: string;
  }>(`/api/projects/${projectId}/attachments/${filename}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 下载附件 GET /api/projects/:id/attachments/download/:filename */
export function getAttachmentDownloadUrl(
  projectId: number,
  filename: string,
): string {
  return `/api/projects/${projectId}/attachments/download/${filename}`;
}

/** 校验附件存在性 GET /api/projects/:id/attachments/check */
export async function checkAttachments(
  projectId: number,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    data: { hasAttachments: boolean };
  }>(`/api/projects/${projectId}/attachments/check`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 推送前置校验 POST /api/projects/:id/push/validate */
export async function validatePush(
  projectId: number,
  customerBudget: number,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    data: {
      hasBusinessQuote: boolean;
      attachmentCount: number;
    };
  }>(`/api/projects/${projectId}/push/validate`, {
    method: 'POST',
    data: { customerBudget },
    ...(options || {}),
  });
}

/** 推送执行 POST /api/projects/:id/push */
export async function pushProject(
  projectId: number,
  customerBudget: number,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    data: { pushId: number };
  }>(`/api/projects/${projectId}/push`, {
    method: 'POST',
    data: { customerBudget },
    ...(options || {}),
  });
}

/** 推送历史查询 GET /api/projects/:id/push-history */
export async function getPushHistory(
  projectId: number,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    data: Array<{
      id: number;
      project_id: number;
      project_name: string;
      our_quote: number;
      customer_budget: number;
      budget_difference: number;
      risk_total_score: number;
      risk_level: string;
      push_time: string;
      push_status: string;
      push_error: string | null;
    }>;
  }>(`/api/projects/${projectId}/push-history`, {
    method: 'GET',
    ...(options || {}),
  });
}
