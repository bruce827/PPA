import { request } from '@umijs/max';

// ========== 统计 ==========

export async function getFormDesignStats() {
  return request('/api/form-design/stats');
}

// ========== 设计项目 CRUD ==========

export async function getFormDesignProjects() {
  return request('/api/form-design/projects');
}

export async function getFormDesignProjectById(id: number) {
  return request(`/api/form-design/projects/${id}`);
}

export async function createFormDesignProject(data: {
  project_name: string;
  project_desc?: string;
  linked_project_id?: number;
}) {
  return request('/api/form-design/projects', {
    method: 'POST',
    data,
  });
}

export async function updateFormDesignProject(
  id: number,
  data: {
    project_name: string;
    project_desc?: string;
    linked_project_id?: number;
  },
) {
  return request(`/api/form-design/projects/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteFormDesignProject(id: number) {
  return request(`/api/form-design/projects/${id}`, {
    method: 'DELETE',
  });
}

// ========== 应用 CRUD ==========

export async function getAppsByProjectId(projectId: number) {
  return request(`/api/form-design/projects/${projectId}/apps`);
}

export async function createApp(data: {
  app_name: string;
  app_code: string;
  project_id?: number;
  description?: string;
}) {
  return request('/api/form-design/apps', {
    method: 'POST',
    data,
  });
}

export async function updateApp(
  id: number,
  data: {
    app_name: string;
    app_code: string;
    project_id?: number;
    description?: string;
    sort_order?: number;
  },
) {
  return request(`/api/form-design/apps/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteApp(id: number) {
  return request(`/api/form-design/apps/${id}`, {
    method: 'DELETE',
  });
}

// ========== 表单 CRUD ==========

export async function getFormsByAppId(appId: number) {
  return request(`/api/form-design/apps/${appId}/forms`);
}

export async function createForm(data: {
  app_id: number;
  form_name: string;
  form_code: string;
  filter_condition?: string;
  description?: string;
}) {
  return request('/api/form-design/forms', {
    method: 'POST',
    data,
  });
}

export async function updateForm(
  id: number,
  data: {
    form_name: string;
    form_code: string;
    filter_condition?: string;
    description?: string;
    sort_order?: number;
  },
) {
  return request(`/api/form-design/forms/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteForm(id: number) {
  return request(`/api/form-design/forms/${id}`, {
    method: 'DELETE',
  });
}

// ========== 字段 CRUD ==========

export async function getFieldsByFormId(formId: number) {
  return request(`/api/form-design/forms/${formId}/fields`);
}

export async function createField(data: any) {
  return request('/api/form-design/fields', {
    method: 'POST',
    data,
  });
}

export async function updateField(id: number, data: any) {
  return request(`/api/form-design/fields/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteField(id: number) {
  return request(`/api/form-design/fields/${id}`, {
    method: 'DELETE',
  });
}

export async function batchUpdateFields(fields: any[]) {
  return request('/api/form-design/fields/batch', {
    method: 'POST',
    data: fields,
  });
}

// ========== 历史项目（复用现有接口）==========

export async function getProjects() {
  return request('/api/projects');
}

// ========== 校验 ==========

export async function validateField(data: any) {
  return request('/api/form-design/validate/field', {
    method: 'POST',
    data,
  });
}

export async function validateForm(formId: number) {
  return request(`/api/form-design/validate/form/${formId}`);
}
