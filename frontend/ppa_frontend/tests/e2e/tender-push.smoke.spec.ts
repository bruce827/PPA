import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { syncTenderStagingFromDirectory } from './support/apiClient';

const writeTenderJson = (directoryPath: string, fileName: string, records: unknown[]) => {
  fs.writeFileSync(
    path.join(directoryPath, fileName),
    JSON.stringify(records, null, 2),
    'utf8',
  );
};

const waitForTenderList = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().includes('/api/opportunity/tender-staging') &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );

test('@smoke @p1 tender push filters data quality and sorts by publish date', async ({
  page,
  request,
}) => {
  const directoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ppa-e2e-tender-'));

  try {
    writeTenderJson(directoryPath, 'e2e-tenders.json', [
      {
        source_item_id: 'e2e-complete-late',
        title: 'E2E 完整较新项目',
        issuer: 'E2E 招标单位',
        publish_date: '2026-05-03',
        deadline_date: '2026-05-20',
        content_text: 'E2E 公告正文',
      },
      {
        source_item_id: 'e2e-missing-issuer',
        title: 'E2E 缺招标单位项目',
        publish_date: '2026-05-02',
        deadline_date: '2026-05-20',
        content_text: 'E2E 公告正文',
      },
      {
        source_item_id: 'e2e-missing-content',
        title: 'E2E 缺正文项目',
        issuer: 'E2E 招标单位',
        publish_date: '2026-05-01',
        deadline_date: '2026-05-20',
        announcement_html: '<p>&nbsp;</p>',
      },
    ]);

    const syncSummary = await syncTenderStagingFromDirectory(request, directoryPath);
    expect(syncSummary.errors).toHaveLength(0);
    expect(syncSummary.created).toBe(3);

    const initialList = waitForTenderList(page);
    await page.goto('/opportunity/tender-push');
    await initialList;

    const rows = page.locator('.ant-table-tbody .ant-table-row');
    await expect(rows.first()).toContainText('E2E 完整较新项目');
    await expect(page.getByText('E2E 缺招标单位项目')).toBeVisible();

    await page.getByText('展开').click();
    await page
      .locator('.ant-form-item')
      .filter({ hasText: '数据完整性' })
      .locator('.ant-select-selector')
      .click();
    await page
      .locator('.ant-select-item-option-content')
      .filter({ hasText: '缺招标单位' })
      .click();
    await page.keyboard.press('Escape');

    const filteredList = waitForTenderList(page);
    await page.getByRole('button', { name: /查\s*询/ }).click();
    await filteredList;

    await expect(page.getByText('E2E 缺招标单位项目')).toBeVisible();
    await expect(page.getByText('E2E 完整较新项目')).not.toBeVisible();
    await expect(page.getByText('E2E 缺正文项目')).not.toBeVisible();

    const resetList = waitForTenderList(page);
    await page.getByRole('button', { name: /重\s*置/ }).click();
    await resetList;

    const sortedList = waitForTenderList(page);
    await page.getByRole('columnheader', { name: /发布日期/ }).click();
    await sortedList;

    await expect(rows.first()).toContainText('E2E 缺正文项目');
  } finally {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  }
});
