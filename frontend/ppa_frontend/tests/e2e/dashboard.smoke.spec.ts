import { expect, test } from '@playwright/test';

import {
  deleteStandardProject,
  deleteWeb3dProject,
  seedStandardProject,
  seedWeb3dProject,
} from './support/apiClient';

test('@smoke @p0 dashboard renders core analytics widgets', async ({
  page,
  request,
}) => {
  const standardProject = await seedStandardProject(request);
  const web3dProject = await seedWeb3dProject(request);

  try {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('数据看板').first()).toBeVisible();
    await expect(page.getByText('项目总数/近30天')).toBeVisible();
    await expect(page.getByText('SaaS/平台项目')).toBeVisible();
    await expect(page.getByText('Web3D项目', { exact: true })).toBeVisible();
    await expect(page.getByText('月度业务趋势')).toBeVisible();
    await expect(page.getByText('核心投入角色 (Top 5)')).toBeVisible();
  } finally {
    await deleteStandardProject(request, standardProject.id);
    await deleteWeb3dProject(request, web3dProject.id);
  }
});
