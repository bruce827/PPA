import type { APIRequestContext } from '@playwright/test';

import {
  createStandardProjectPayload,
  createWeb3dProjectPayload,
} from './factories';

const backendBaseURL = `http://127.0.0.1:${process.env.PPA_E2E_BACKEND_PORT || 3101}`;

type CreatedProject = {
  id: number;
  name: string;
};

type TenderStagingSyncSummary = {
  fileCount: number;
  rawRecordCount: number;
  deduplicatedCount: number;
  created: number;
  updated: number;
  errors: string[];
};

const parseJson = async (response: Awaited<ReturnType<APIRequestContext['post']>>) => {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
};

export async function seedStandardProject(
  request: APIRequestContext,
  name?: string,
): Promise<CreatedProject> {
  const payload = createStandardProjectPayload(name);
  const response = await request.post(`${backendBaseURL}/api/projects`, {
    data: payload,
  });
  const body = await parseJson(response);

  if (!response.ok() || !body?.id) {
    throw new Error(
      `Failed to seed standard project: ${response.status()} ${JSON.stringify(body)}`,
    );
  }

  return {
    id: Number(body.id),
    name: payload.name,
  };
}

export async function seedWeb3dProject(
  request: APIRequestContext,
  name?: string,
): Promise<CreatedProject> {
  const payload = createWeb3dProjectPayload(name);
  const response = await request.post(`${backendBaseURL}/api/web3d/projects`, {
    data: payload,
  });
  const body = await parseJson(response);

  if (!response.ok() || !body?.id) {
    throw new Error(
      `Failed to seed Web3D project: ${response.status()} ${JSON.stringify(body)}`,
    );
  }

  return {
    id: Number(body.id),
    name: payload.name,
  };
}

export async function deleteStandardProject(
  request: APIRequestContext,
  id: number,
) {
  await request.delete(`${backendBaseURL}/api/projects/${id}`);
}

export async function deleteWeb3dProject(request: APIRequestContext, id: number) {
  await request.delete(`${backendBaseURL}/api/web3d/projects/${id}`);
}

export async function syncTenderStagingFromDirectory(
  request: APIRequestContext,
  directoryPath: string,
): Promise<TenderStagingSyncSummary> {
  const response = await request.post(
    `${backendBaseURL}/api/opportunity/tender-staging/sync`,
    {
      data: {
        directoryPath,
        pruneMissing: false,
      },
    },
  );
  const body = await parseJson(response);

  if (!response.ok() || body?.success !== true) {
    throw new Error(
      `Failed to sync tender staging: ${response.status()} ${JSON.stringify(body)}`,
    );
  }

  return body.data;
}
