import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  preserveLocalSyncConfigs,
  redactSyncConfigs,
  resolveSyncConfigSettings,
} from '../../src/utils/syncConfigSettings.ts';

test('prefers_nested_sync_configs_over_legacy_records', () => {
  const result = resolveSyncConfigSettings(
    { webdavConfig: { url: 'nested', username: 'user', password: 'secret' } },
    { url: 'legacy', username: '', password: '' },
    null,
  );

  assert.equal(result.webdavConfig.url, 'nested');
});

test('redacts_nested_and_legacy_sync_credentials', () => {
  const result = redactSyncConfigs({
    settings: JSON.stringify({ theme: 'dark', webdavConfig: { password: 'secret' }, gistConfig: { token: 'token' } }),
    webdavConfig: JSON.stringify({ password: 'legacy-secret' }),
    gistConfig: JSON.stringify({ token: 'legacy-token' }),
  });

  assert.deepEqual(JSON.parse(result.settings ?? '{}'), { theme: 'dark' });
  assert.equal('webdavConfig' in result, false);
  assert.equal('gistConfig' in result, false);
});

test('preserves_device_credentials_when_applying_remote_settings', () => {
  const result = preserveLocalSyncConfigs(
    {
      settings: JSON.stringify({ theme: 'light', webdavConfig: { password: 'remote-secret' } }),
      gistConfig: JSON.stringify({ token: 'remote-token' }),
    },
    {
      settings: JSON.stringify({
        theme: 'dark',
        webdavConfig: { url: 'https://dav.example', username: 'user', password: 'local-secret' },
        gistConfig: { token: 'local-token', gistId: 'gist-id' },
      }),
    },
  );

  const settings = JSON.parse(result.settings ?? '{}');
  assert.equal(settings.theme, 'light');
  assert.equal(settings.webdavConfig.password, 'local-secret');
  assert.equal(settings.gistConfig.token, 'local-token');
  assert.equal('gistConfig' in result, false);
});
