import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { loginToBarkeep, pingBarkeep } from '../../src/utils/cloud/barkeep.ts';
import type { BarkeepConnectionConfig } from '../../src/types/barkeep.ts';

const originalFetch = globalThis.fetch;
const statusBody = {
  user: 'demo',
  mode: 'multi-user',
  counts: {
    characters: 2,
    worlds: 3,
    presets: 4,
    characterChatGroups: 1,
    characterChats: 5,
    groupChats: 1,
    chats: 6,
  },
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('logs_in_and_pings_standalone_barkeep', async () => {
  const requests: Array<{ url: string; authorization: string | null; body: string | null }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    requests.push({
      url,
      authorization: headers.get('Authorization'),
      body: typeof init?.body === 'string' ? init.body : null,
    });
    if (url.endsWith('/v1/login')) {
      return Response.json({ enabled: true, token: 'standalone-token', expiresIn: 3600 });
    }
    return Response.json(statusBody);
  };

  const config: BarkeepConnectionConfig = {
    mode: 'standalone',
    baseUrl: 'http://127.0.0.1:10024',
    multiUser: true,
    handle: 'demo',
    password: 'secret',
    basicAuth: { enabled: false },
  };
  const session = await loginToBarkeep(config);
  const status = await pingBarkeep(config, session);

  assert.deepEqual(status, statusBody);
  assert.deepEqual(requests, [
    {
      url: 'http://127.0.0.1:10024/v1/login',
      authorization: null,
      body: JSON.stringify({ handle: 'demo', password: 'secret' }),
    },
    {
      url: 'http://127.0.0.1:10024/v1/demo/status/list',
      authorization: 'Bearer standalone-token',
      body: null,
    },
  ]);
});

test('sends_router_session_csrf_and_basic_auth', async () => {
  const requests: Array<{ path: string; authorization: string | null; csrf: string | null }> = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    requests.push({
      path: url.pathname,
      authorization: headers.get('Authorization'),
      csrf: headers.get('X-CSRF-Token'),
    });
    if (url.pathname === '/csrf-token') return Response.json({ token: 'csrf-token' });
    if (url.pathname === '/api/users/login') return Response.json({ handle: 'demo' });
    return Response.json(statusBody);
  };

  const config: BarkeepConnectionConfig = {
    mode: 'sillytavern',
    baseUrl: 'http://127.0.0.1:4173',
    multiUser: true,
    handle: 'demo',
    password: 'secret',
    basicAuth: {
      enabled: true,
      username: 'http-user',
      password: 'http-password',
    },
  };
  const session = await loginToBarkeep(config);
  await pingBarkeep(config, session);

  assert.deepEqual(requests, [
    {
      path: '/csrf-token',
      authorization: 'Basic aHR0cC11c2VyOmh0dHAtcGFzc3dvcmQ=',
      csrf: null,
    },
    {
      path: '/api/users/login',
      authorization: 'Basic aHR0cC11c2VyOmh0dHAtcGFzc3dvcmQ=',
      csrf: 'csrf-token',
    },
    {
      path: '/api/plugins/barkeep/v1/demo/status/list',
      authorization: 'Basic aHR0cC11c2VyOmh0dHAtcGFzc3dvcmQ=',
      csrf: null,
    },
  ]);
});
