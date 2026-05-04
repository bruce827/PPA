import { expect, test } from '@playwright/test';

import { deleteWeb3dProject, seedWeb3dProject } from './support/apiClient';

test('@smoke @p1 seeded Web3D project appears in history', async ({
  page,
  request,
}) => {
  const project = await seedWeb3dProject(request);

  try {
    const listResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/web3d/projects') &&
        response.status() === 200,
    );

    await page.goto('/web3d/history');
    await listResponse;

    await expect(page).toHaveURL(/\/web3d\/history$/);
    await expect(page.getByText('Web3D 历史项目').first()).toBeVisible();
    await expect(page.getByText(project.name)).toBeVisible();
    await expect(page.getByText('web3d').first()).toBeVisible();
  } finally {
    await deleteWeb3dProject(request, project.id);
  }
});
