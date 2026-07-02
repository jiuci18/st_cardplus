import { expect, test, type Page } from '@playwright/test';

const legacySnapshot = (name: string) => ({
  projects: [
    {
      id: 'project-1',
      name,
      description: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  landmarks: [
    {
      id: 'landmark-1',
      projectId: 'project-1',
      name: `${name}地标`,
      description: '',
      type: 'city',
      importance: 2,
      tags: [],
      parentLandmarkIds: [],
      childLandmarkIds: [],
      controllingForces: [],
      relatedLandmarks: [],
      roadConnections: [],
      resources: [],
      notes: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 1,
    },
  ],
  forces: [],
  regions: [],
});

const readWorldEditorDatabase = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{
        version: number;
        projects: Array<{ id: string; name: string; order: number }>;
        landmarks: Array<{ id: string; name: string; order: number }>;
      }>((resolve, reject) => {
        const request = indexedDB.open('appDatabase');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(['worldProjects', 'worldLandmarks'], 'readonly');
          const projectsRequest = transaction.objectStore('worldProjects').getAll();
          const landmarksRequest = transaction.objectStore('worldLandmarks').getAll();
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            resolve({
              version: database.version,
              projects: projectsRequest.result,
              landmarks: landmarksRequest.result,
            });
            database.close();
          };
        };
      })
  );

test('migrates_legacy_world_editor_data_once', async ({ page }) => {
  await page.addInitScript((snapshot) => {
    localStorage.setItem('world-editor-data', JSON.stringify(snapshot));
  }, legacySnapshot('旧项目'));

  await page.goto('/world');
  await expect(page.locator('.world-editor-storage-state')).toBeHidden();

  const migrated = await readWorldEditorDatabase(page);
  expect(migrated.version).toBe(4);
  expect(migrated.projects).toEqual([
    expect.objectContaining({ id: 'project-1', name: '旧项目', order: 0 }),
  ]);
  expect(migrated.landmarks).toEqual([
    expect.objectContaining({ id: 'landmark-1', name: '旧项目地标', order: 0 }),
  ]);
  expect(await page.evaluate(() => localStorage.getItem('world-editor-data'))).toBeNull();

  await page.reload();
  await expect(page.locator('.world-editor-storage-state')).toBeHidden();
  expect((await readWorldEditorDatabase(page)).projects).toHaveLength(1);
});

test('prefers_indexeddb_over_stale_legacy_data', async ({ page }) => {
  await page.addInitScript((snapshot) => {
    if (!sessionStorage.getItem('seeded-world-editor')) {
      localStorage.setItem('world-editor-data', JSON.stringify(snapshot));
      sessionStorage.setItem('seeded-world-editor', 'true');
    }
  }, legacySnapshot('数据库项目'));

  await page.goto('/world');
  await expect(page.locator('.world-editor-storage-state')).toBeHidden();

  await page.evaluate((snapshot) => {
    localStorage.setItem('world-editor-data', JSON.stringify(snapshot));
  }, legacySnapshot('过期项目'));
  await page.reload();
  await expect(page.locator('.world-editor-storage-state')).toBeHidden();

  const stored = await readWorldEditorDatabase(page);
  expect(stored.projects[0]?.name).toBe('数据库项目');
  expect(await page.evaluate(() => localStorage.getItem('world-editor-data'))).toBeNull();
});

test('downloads_invalid_legacy_data_before_rebuilding_workspace', async ({ page }) => {
  const invalidData = '{"projects":';
  await page.addInitScript((raw) => {
    localStorage.setItem('world-editor-data', raw);
  }, invalidData);

  await page.goto('/world');
  await expect(page.getByText('旧版世界编辑器数据无法解析，原数据已保留')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载数据并重建工作区' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^world-editor-legacy-recovery-\d{4}-\d{2}-\d{2}\.json$/);

  await expect(page.locator('.world-editor-storage-state')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('world-editor-data'))).toBeNull();
  const stored = await readWorldEditorDatabase(page);
  expect(stored.projects).toEqual([]);
  expect(stored.landmarks).toEqual([]);
});
