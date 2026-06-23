import { request } from '@umijs/max';

export interface WikiTreeItem {
  wiki_key: string;
  title: string;
  desc: string;
  inIndex: boolean;
}

export interface WikiContentData {
  key: string;
  content: string;
}

/**
 * 获取 Wiki 目录树
 * @param project 项目文件夹名称（可选）
 * @param refresh 是否强制刷新缓存
 */
export async function getWikiTree(project?: string, refresh?: boolean) {
  return request<{
    success: boolean;
    data: WikiTreeItem[];
    projects?: string[];
    currentProject?: string;
  }>('/api/wiki', {
    params: {
      project,
      refresh: refresh ? true : undefined,
    },
  });
}

/**
 * 获取特定 Wiki 正文内容
 * @param path Wiki 相对路径
 * @param refresh 是否强制刷新缓存
 */
export async function getWikiContent(path: string, refresh?: boolean) {
  return request<{ success: boolean; data: WikiContentData }>('/api/wiki/content', {
    params: {
      path,
      refresh: refresh ? true : undefined,
    },
  });
}

/**
 * 获取 Wiki 与项目评估绑定关系
 * @param params 可以传 wiki_key 或 project_id
 */
export async function getWikiRelations(params: { wiki_key?: string; project_id?: number }) {
  return request<{ success: boolean; data: number[] | string[] }>('/api/wiki/relations', {
    params,
  });
}

/**
 * 保存 Wiki 与项目评估绑定关系（全量覆盖）
 */
export async function saveWikiRelations(data: {
  wiki_key?: string;
  project_ids?: number[];
  project_id?: number;
  wiki_keys?: string[];
}) {
  return request<{ success: boolean }>('/api/wiki/relations', {
    method: 'POST',
    data,
  });
}
