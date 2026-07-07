import Dexie, { type Table } from 'dexie';
import type { WorldBook, WorldBookEntry } from '@/types/worldbook';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';
import type { OpenAIChatCompletionPreset } from '../types/openai-preset';
import type { BarkeepResourceLink } from '@/types/barkeep';
import { trackIndexedDbEdit } from '@/utils/editSessionTracker';
import type {
  Project,
  EnhancedLandmark,
  EnhancedForce,
  EnhancedRegion,
} from '@/types/worldeditor/world-editor';

// 定义存储在 IndexedDB 中的 WorldBookEntry 结构，增加了 bookId 作为外键
export interface StoredWorldBookEntry extends WorldBookEntry {
  id?: number;
  bookId: string;
}
export interface StoredWorldBook extends Omit<WorldBook, 'entries'> {
  /** Optional stable Barkeep UUID/path mapping for this world book. */
  barkeep?: BarkeepResourceLink;
}
export interface StoredCharacterCard {
  id: string; // UUID 主键
  name: string; // 角色名称
  description?: string; // 角色简介
  avatar?: string; // 头像信息
  cardData: CharacterCardV3; // 完整的角色卡数据
  createdAt: string; // 创建时间 ISO 8601
  updatedAt: string; // 更新时间 ISO 8601
  order: number; // 排序序号
  tags?: string[]; // 标签
  metadata?: Record<string, any>; // 额外元数据
  /** Optional stable Barkeep UUID/path mapping for this character card. */
  barkeep?: BarkeepResourceLink;
}

export interface StoredPresetFile {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  data: Omit<OpenAIChatCompletionPreset, 'prompts'> & { prompts: Record<string, any>[] };
  /** Optional stable Barkeep UUID/path mapping for this preset file. */
  barkeep?: BarkeepResourceLink;
}

/** Ordered project record stored by the world editor. */
export interface StoredWorldProject extends Project {
  order: number;
}

/** Ordered landmark record stored by the world editor. */
export interface StoredWorldLandmark extends EnhancedLandmark {
  order: number;
}

/** Ordered force record stored by the world editor. */
export interface StoredWorldForce extends EnhancedForce {
  order: number;
}

/** Ordered region record stored by the world editor. */
export interface StoredWorldRegion extends EnhancedRegion {
  order: number;
}

/**
 * 定义应用主数据库类
 * 包含世界书、角色卡等所有应用数据
 */
class AppDatabase extends Dexie {
  private editTrackingHooksRegistered = false;

  /**
   * `books` 表，用于存储世界书的元数据
   * 主键是 `id` (string, UUID)
   * 索引了 `name`, `order`, `updatedAt` 字段以便查询和排序
   */
  books!: Table<StoredWorldBook, string>;

  /**
   * `entries` 表，用于存储所有世界书的条目
   * 主键是 `id` (number, auto-incrementing)
   * 索引了 `bookId` 以便快速检索属于特定书籍的所有条目
   * 索引了 `uid` 以保留旧数据结构中的唯一标识符
   */
  entries!: Table<StoredWorldBookEntry, number>;

  /**
   * `characterCards` 表，用于存储角色卡
   * 主键是 `id` (string, UUID)
   * 索引了 `name`, `order`, `updatedAt` 字段以便查询和排序
   */
  characterCards!: Table<StoredCharacterCard, string>;

  /**
   * `presets` 表，用于存储预设文件
   * 主键是 `id` (string, UUID)
   * 索引了 `name`, `order`, `updatedAt` 字段以便查询和排序
   */
  presets!: Table<StoredPresetFile, string>;

  /** World editor project records. */
  worldProjects!: Table<StoredWorldProject, string>;

  /** World editor landmark records. */
  worldLandmarks!: Table<StoredWorldLandmark, string>;

  /** World editor force records. */
  worldForces!: Table<StoredWorldForce, string>;

  /** World editor region records. */
  worldRegions!: Table<StoredWorldRegion, string>;

  constructor() {
    super('appDatabase');
    this.version(1).stores({
      books: '&id, name, order, updatedAt',
      entries: '++id, bookId, uid',
    });
    this.version(2).stores({
      books: '&id, name, order, updatedAt',
      entries: '++id, bookId, uid',
      characterCards: '&id, name, order, updatedAt',
    });
    this.version(3).stores({
      books: '&id, name, order, updatedAt',
      entries: '++id, bookId, uid',
      characterCards: '&id, name, order, updatedAt',
      presets: '&id, name, order, updatedAt',
    });
    this.version(4).stores({
      books: '&id, name, order, updatedAt',
      entries: '++id, bookId, uid',
      characterCards: '&id, name, order, updatedAt',
      presets: '&id, name, order, updatedAt',
      worldProjects: '&id, order, updatedAt',
      worldLandmarks: '&id, projectId, regionId, order, updatedAt',
      worldForces: '&id, projectId, order, updatedAt',
      worldRegions: '&id, projectId, order, updatedAt',
    });
    this.version(5).stores({
      books: '&id, name, order, updatedAt',
      entries: '++id, bookId, uid',
      characterCards: '&id, name, order, updatedAt',
      presets: '&id, name, order, updatedAt',
      worldProjects: '&id, order, updatedAt',
      worldLandmarks: '&id, projectId, regionId, order, updatedAt',
      worldForces: '&id, projectId, order, updatedAt',
      worldRegions: '&id, projectId, order, updatedAt',
    });
    this.on('ready', () => {
      this.registerEditTrackingHooks();
    });
  }

  private registerEditTrackingHooks(): void {
    if (this.editTrackingHooksRegistered) return;
    this.editTrackingHooksRegistered = true;

    for (const table of this.tables) {
      const tableName = table.name;
      table.hook('creating', (primaryKey) => {
        trackIndexedDbEdit({ table: tableName, operation: 'create', primaryKey });
      });
      table.hook('updating', (modifications, primaryKey) => {
        trackIndexedDbEdit({
          table: tableName,
          operation: 'update',
          primaryKey,
          fields: Object.keys(modifications),
        });
      });
      table.hook('deleting', (primaryKey) => {
        trackIndexedDbEdit({ table: tableName, operation: 'delete', primaryKey });
      });
    }
  }
}

// 导出数据库的单例
export const db = new AppDatabase();
