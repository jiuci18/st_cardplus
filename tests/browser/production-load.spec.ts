import { expect, test } from '@playwright/test';

test('loads_production_build_without_runtime_errors', async ({ page }) => {
  const runtimeErrors: string[] = [];

  page.on('pageerror', (error) => {
    runtimeErrors.push(error.stack ?? error.message);
  });

  const response = await page.goto('/', { waitUntil: 'networkidle' });

  expect(response?.ok()).toBe(true);
  await expect(page.locator('#app > .app-layout')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
