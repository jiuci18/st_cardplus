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

for (const workspace of [
  { route: '/presetmanager', createLabel: '创建新预设', bookmark: '预设', prefix: '清理回归预设' },
  { route: '/worldbook', createLabel: '创建新世界书', bookmark: '列表', prefix: '清理回归世界书' },
]) {
  test(`${workspace.route} keeps list actions working across desktop and mobile layouts`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(workspace.route, { waitUntil: 'networkidle' });

    const name = `${workspace.prefix}-${Date.now()}`;
    await page.getByRole('button', { name: workspace.createLabel, exact: true }).click();
    const dialog = page.locator('.el-message-box');
    await dialog.locator('input').fill(name);
    await dialog.getByRole('button', { name: '创建', exact: true }).click();
    const treeLabel = page.locator('.sidebar-tree-node-label').filter({ hasText: name });
    await expect(treeLabel).toHaveCount(1);
    await expect(treeLabel).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    if (workspace.route === '/worldbook') {
      // The empty-book list drawer opens automatically on touch layouts.
      await expect(page.locator('.mobile-bookmark-drawer-panel')).toBeVisible();
    } else {
      await page.locator('.mobile-bookmark-btn').filter({ hasText: workspace.bookmark }).click();
    }
    await expect(page.locator('.mobile-bookmark-drawer-panel').getByRole('button', { name: workspace.createLabel, exact: true })).toBeVisible();
    await expect(treeLabel).toHaveCount(1);
    await expect(treeLabel).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.getByRole('button', { name: workspace.createLabel, exact: true })).toBeVisible();
    await expect(treeLabel).toHaveCount(1);
    await expect(treeLabel).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
}
