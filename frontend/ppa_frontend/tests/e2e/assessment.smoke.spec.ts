import { expect, test } from '@playwright/test';

import {
  deleteStandardProject,
  seedStandardProject,
} from './support/apiClient';

test('@smoke @p0 seeded standard project appears in history and detail', async ({
  page,
  request,
}) => {
  const project = await seedStandardProject(request);

  try {
    const listResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/projects') && response.status() === 200,
    );

    await page.goto('/assessment/history');
    await listResponse;

    const projectLink = page.getByRole('link', { name: project.name });
    await expect(projectLink).toBeVisible();

    await projectLink.click();
    await expect(page).toHaveURL(new RegExp(`/assessment/detail/${project.id}$`));
    await expect(page.getByText(project.name).first()).toBeVisible();
    await expect(page.getByText('项目概览')).toBeVisible();
    await expect(page.getByText('实施成本', { exact: true })).toBeVisible();
  } finally {
    await deleteStandardProject(request, project.id);
  }
});
