/**
 * GitHub Gist 同步相关类型定义
 */

/**
 * Gist 配置信息
 */
export interface GistConfig {
  /** GitHub Personal Access Token */
  token: string;
  /** Gist ID */
  gistId: string;
  /** 最后同步时间 */
  lastSyncTime?: string;
  /** 是否启用自动同步 */
  autoSync?: boolean;
}

/**
 * 备份数据结构
 */
export interface BackupData {
  /** 备份创建时间 */
  timestamp: string;
  /** 应用版本 */
  version: string;
  /** localStorage 数据 */
  localStorage: Record<string, any>;
  /** IndexedDB 数据库数据 */
  databases: {
    characterCards: any[];
    books: any[];
    entries: any[];
  };
}

/**
 * Gist 操作响应
 */
export interface GistResponse {
  success: boolean;
  message: string;
  data?: any;
  /** 原始备份文件的 UTF-8 字节数。 */
  backupSizeBytes?: number;
}

/**
 * Gist 信息
 */
export interface GistInfo {
  id: string;
  description: string;
  public: boolean;
  created_at: string;
  updated_at: string;
  files: Record<
    string,
    {
      filename: string;
      size: number;
    }
  >;
}
