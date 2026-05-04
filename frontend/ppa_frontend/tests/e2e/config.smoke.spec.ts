import { expect, test } from '@playwright/test';

test('@smoke @p1 config page loads core configuration tables', async ({
  page,
}) => {
  const rolesResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/config/roles') && response.status() === 200,
  );

  await page.goto('/config');
  await rolesResponse;

  await expect(page).toHaveURL(/\/config$/);
  await expect(page.getByText('参数配置').first()).toBeVisible();
  await expect(
    page.getByRole('tab', { name: '角色与单价管理' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /新\s*建/ }).first(),
  ).toBeVisible();
});
