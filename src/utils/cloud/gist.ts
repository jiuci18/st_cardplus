/**
 * GitHub Gist 同步工具
 * 提供与 GitHub Gist 交互的 API 封装
 */

import { Octokit } from '@octokit/rest';
import type { GistConfig, BackupData, GistResponse, GistInfo } from '@/types/gist';
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/utils/localStorageUtils';

const BACKUP_FILENAME = 'st-cardplus-backup.json';
const GIST_DESCRIPTION = 'SillyTavern Card Plus 数据备份';

/**
 * 创建 Octokit 客户端实例
 */
function createOctokitClient(token: string): Octokit {
  return new Octokit({
    auth: token,
  });
}

/**
 * 测试 GitHub Token 是否有效
 */
export async function testGistConnection(token: string): Promise<GistResponse> {
  try {
    const octokit = createOctokitClient(token);
    const { data } = await octokit.users.getAuthenticated();

    return {
      success: true,
      message: `连接成功! 当前用户: ${data.login}`,
      data: {
        username: data.login,
        avatar: data.avatar_url,
      },
    };
  } catch (error: any) {
    console.error('测试 Gist 连接失败:', error);

    if (error.status === 401) {
      return {
        success: false,
        message: 'Token 无效或已过期,请检查您的 Personal Access Token',
      };
    }

    return {
      success: false,
      message: `连接失败: ${error.message || '未知错误'}`,
    };
  }
}

/**
 * 创建新的备份 Gist (Secret Gist)
 */
export async function createBackupGist(token: string, backupData: BackupData): Promise<GistResponse> {
  try {
    const octokit = createOctokitClient(token);

    const { data } = await octokit.gists.create({
      description: GIST_DESCRIPTION,
      public: false, // 创建私密 Gist
      files: {
        [BACKUP_FILENAME]: {
          content: JSON.stringify(backupData, null, 2),
        },
      },
    });

    return {
      success: true,
      message: `成功创建备份 Gist! ID: ${data.id}`,
      data: {
        gistId: data.id,
        url: data.html_url,
      },
    };
  } catch (error: any) {
    console.error('创建 Gist 失败:', error);
    return {
      success: false,
      message: `创建失败: ${error.message || '未知错误'}`,
    };
  }
}

/**
 * 上传备份数据到指定的 Gist
 */
export async function uploadToGist(token: string, gistId: string, backupData: BackupData): Promise<GistResponse> {
  try {
    const octokit = createOctokitClient(token);

    // 先检查 Gist 是否存在
    try {
      await octokit.gists.get({ gist_id: gistId });
    } catch (error: any) {
      if (error.status === 404) {
        return {
          success: false,
          message: 'Gist 不存在,请检查 Gist ID 或创建新的 Gist',
        };
      }
      throw error;
    }

    // 更新 Gist
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [BACKUP_FILENAME]: {
          content: JSON.stringify(backupData, null, 2),
        },
      },
    });

    return {
      success: true,
      message: '备份数据已成功推送到 Gist',
    };
  } catch (error: any) {
    console.error('上传到 Gist 失败:', error);
    return {
      success: false,
      message: `上传失败: ${error.message || '未知错误'}`,
    };
  }
}

/**
 * 从 Gist 下载备份数据
 */
async function downloadFromGist(token: string, gistId: string): Promise<GistResponse> {
  try {
    const octokit = createOctokitClient(token);

    console.log('[Gist API] 正在获取 Gist:', gistId);
    const { data } = await octokit.gists.get({ gist_id: gistId });

    console.log('[Gist API] Gist 文件列表:', Object.keys(data.files || {}));

    // 检查文件是否存在
    const file = data.files?.[BACKUP_FILENAME];
    if (!file) {
      console.error('[Gist API] 未找到备份文件:', BACKUP_FILENAME);
      return {
        success: false,
        message: `Gist 中未找到备份文件: ${BACKUP_FILENAME}`,
      };
    }

    console.log('[Gist API] 文件大小:', file.size);
    console.log('[Gist API] 文件是否被截断:', file.truncated);

    let content: string;

    // 如果文件被截断或没有 content 字段,使用 raw_url 下载完整内容
    if (file.truncated || !file.content) {
      console.log('[Gist API] 文件被截断,使用 raw_url 下载完整内容:', file.raw_url);

      if (!file.raw_url) {
        return {
          success: false,
          message: '无法获取文件内容: 缺少 raw_url',
        };
      }

      const response = await fetch(file.raw_url);
      if (!response.ok) {
        throw new Error(`下载文件失败: ${response.statusText}`);
      }
      content = await response.text();
      console.log('[Gist API] 通过 raw_url 下载完成,文件大小:', content.length);
    } else {
      content = file.content;
      console.log('[Gist API] 使用 API 返回的文件内容,长度:', content.length);
    }

    console.log('[Gist API] 文件内容前100字符:', content.substring(0, 100));

    // 解析备份数据
    let backupData: BackupData;
    try {
      backupData = JSON.parse(content);
      console.log('[Gist API] JSON 解析成功');
      console.log('[Gist API] 数据结构:', {
        timestamp: backupData.timestamp,
        version: backupData.version,
        hasLocalStorage: !!backupData.localStorage,
        hasDatabases: !!backupData.databases,
        localStorageType: typeof backupData.localStorage,
        databasesType: typeof backupData.databases,
      });
    } catch (error) {
      console.error('[Gist API] JSON 解析失败:', error);
      console.error('[Gist API] 内容末尾500字符:', content.substring(content.length - 500));
      return {
        success: false,
        message: '备份数据格式错误,无法解析 JSON',
      };
    }

    return {
      success: true,
      message: '成功从 Gist 下载备份数据',
      data: backupData,
    };
  } catch (error: any) {
    console.error('[Gist API] 下载失败:', error);

    if (error.status === 404) {
      return {
        success: false,
        message: 'Gist 不存在,请检查 Gist ID',
      };
    }

    return {
      success: false,
      message: `下载失败: ${error.message || '未知错误'}`,
    };
  }
}

async function fetchTextWithProgress(
  url: string,
  onProgress?: (progress: { loaded: number; total: number; lengthComputable: boolean }) => void
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'text';

    xhr.onprogress = (event) => {
      if (onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
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
 * 从 Gist 下载备份数据（带进度）
 */
export async function downloadFromGistWithProgress(
  token: string,
  gistId: string,
  onProgress?: (progress: { loaded: number; total?: number; lengthComputable?: boolean }) => void
): Promise<GistResponse> {
  try {
    const octokit = createOctokitClient(token);

    const { data } = await octokit.gists.get({ gist_id: gistId });
    const file = data.files?.[BACKUP_FILENAME];
    if (!file) {
      return {
        success: false,
        message: `Gist 中未找到备份文件: ${BACKUP_FILENAME}`,
      };
    }

    if (!file.raw_url) {
      return await downloadFromGist(token, gistId);
    }

    const content = await fetchTextWithProgress(file.raw_url, (progress) => {
      onProgress?.({
        loaded: progress.loaded,
        total: progress.lengthComputable ? progress.total : undefined,
        lengthComputable: progress.lengthComputable,
      });
    });

    let backupData: BackupData;
    try {
      backupData = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        message: '备份数据格式错误,无法解析 JSON',
      };
    }

    return {
      success: true,
      message: '成功从 Gist 下载备份数据',
      data: backupData,
    };
  } catch (error: any) {
    console.error('[Gist API] 下载失败:', error);

    if (error.status === 404) {
      return {
        success: false,
        message: 'Gist 不存在,请检查 Gist ID',
      };
    }

    return {
      success: false,
      message: `下载失败: ${error.message || '未知错误'}`,
    };
  }
}

/**
 * 列出当前用户的所有 Gists
 */
export async function listUserGists(token: string): Promise<GistResponse> {
  try {
    const octokit = createOctokitClient(token);

    const { data } = await octokit.gists.list({
      per_page: 100, // 最多获取 100 个
    });

    // 筛选出包含备份文件的 Gists
    const backupGists: GistInfo[] = data
      .filter((gist) => gist.files?.[BACKUP_FILENAME])
      .map((gist) => ({
        id: gist.id,
        description: gist.description || '(无描述)',
        public: gist.public,
        created_at: gist.created_at,
        updated_at: gist.updated_at,
        files: Object.fromEntries(
          Object.entries(gist.files || {})
            .filter(([_, file]) => file?.filename && file?.size !== undefined)
            .map(([name, file]) => [
              name,
              {
                filename: file!.filename!,
                size: file!.size!,
              },
            ])
        ),
      }));

    return {
      success: true,
      message: `找到 ${backupGists.length} 个备份 Gist`,
      data: backupGists,
    };
  } catch (error: any) {
    console.error('列出 Gists 失败:', error);
    return {
      success: false,
      message: `获取列表失败: ${error.message || '未知错误'}`,
    };
  }
}

/**
 * 从 localStorage 加载 Gist 配置
 */
export function loadGistConfig(): GistConfig | null {
  try {
    return readLocalStorageJSON<GistConfig>('gistConfig');
  } catch (error) {
    console.error('加载 Gist 配置失败:', error);
    return null;
  }
}

/**
 * 保存 Gist 配置到 localStorage
 */
export function saveGistConfig(config: GistConfig): void {
  try {
    writeLocalStorageJSON('gistConfig', config);
  } catch (error) {
    console.error('保存 Gist 配置失败:', error);
    throw new Error('保存配置失败');
  }
}
