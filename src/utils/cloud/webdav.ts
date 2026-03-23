import { createClient } from 'webdav';
import type { WebDAVClientOptions } from 'webdav';

export interface WebDAVConnectionOptions extends WebDAVClientOptions {
  url: string;
}

type TauriWebDAVAction = 'test' | 'upload' | 'download';

const isTauriApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
};

async function invokeTauri<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

function buildTauriWebDAVArgs(
  options: WebDAVConnectionOptions,
  action: TauriWebDAVAction,
  remotePath?: string,
  data?: string
) {
  return {
    action,
    url: options.url,
    username: options.username || '',
    password: options.password || '',
    remotePath,
    remote_path: remotePath,
    data,
  };
}

async function tauriWebDAVRequest<T>(
  options: WebDAVConnectionOptions,
  action: TauriWebDAVAction,
  remotePath?: string,
  data?: string
) {
  return invokeTauri<T>('webdav_request', buildTauriWebDAVArgs(options, action, remotePath, data));
}

/**
 * 创建一个 WebDAV 客户端实例
 * @param options - WebDAV 连接选项
 * @returns WebDAV 客户端实例
 */
function createWebDAVClient(options: WebDAVConnectionOptions) {
  return createClient(options.url, {
    username: options.username,
    password: options.password,
  });
}

function buildWebDAVUrl(baseUrl: string, remotePath: string) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(remotePath, normalizedBase).toString();
}

function buildAuthHeader(options: WebDAVConnectionOptions) {
  if (!options.username && !options.password) return null;
  const token = btoa(`${options.username ?? ''}:${options.password ?? ''}`);
  return `Basic ${token}`;
}

export async function uploadToWebDAVWithProgress(
  options: WebDAVConnectionOptions,
  remotePath: string,
  data: string,
  onProgress?: (progress: number) => void
) {
  if (isTauriApp()) {
    await tauriWebDAVRequest<void>(options, 'upload', remotePath, data);
    onProgress?.(1);
    return;
  }

  const url = buildWebDAVUrl(options.url, remotePath);
  const authHeader = buildAuthHeader(options);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (authHeader) xhr.setRequestHeader('Authorization', authHeader);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(xhr.statusText || `HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send(data);
  });
}

export async function downloadFromWebDAVWithProgress(
  options: WebDAVConnectionOptions,
  remotePath: string,
  onProgress?: (progress: { loaded: number; total?: number; lengthComputable?: boolean }) => void
): Promise<string> {
  if (isTauriApp()) {
    const content = await tauriWebDAVRequest<string>(options, 'download', remotePath);
    const size = new TextEncoder().encode(content).length;
    onProgress?.({ loaded: size, total: size, lengthComputable: true });
    return content;
  }

  const url = buildWebDAVUrl(options.url, remotePath);
  const authHeader = buildAuthHeader(options);

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    if (authHeader) xhr.setRequestHeader('Authorization', authHeader);

    xhr.onprogress = (event) => {
      if (onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : undefined,
          lengthComputable: event.lengthComputable,
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(xhr.statusText || `HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send();
  });
}

/**
 * 测试 WebDAV 连接
 * @param options - WebDAV 连接选项
 * @returns Promise<void>
 */
export async function testWebDAVConnection(options: WebDAVConnectionOptions): Promise<void> {
  if (isTauriApp()) {
    await tauriWebDAVRequest<void>(options, 'test');
    return;
  }

  const client = createWebDAVClient(options);
  // 尝试列出根目录的内容来验证连接
  await client.getDirectoryContents('/');
}
