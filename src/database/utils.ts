import { db } from './db';
const textEncoder = new TextEncoder();

export function estimateEncodedSize(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    return json ? textEncoder.encode(json).length : 0;
  } catch (error) {
    console.warn('Failed to estimate encoded size:', error);
    return 0;
  }
}

export async function resetAppDatabase(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

// 数据库导出/导入接口
interface DatabaseService {
  exportDatabase: () => Promise<any>;
  importDatabase: (data: any) => Promise<void>;
}

// 数据库注册表条目
interface DatabaseRegistry {
  key: string; // 存储键名，如 'ST_CARDPLUS_WORLDBOOK_V1'
  service: DatabaseService;
  label: string; // 用户可读名称，如 '世界书'
}

async function getRegisteredDatabases(): Promise<DatabaseRegistry[]> {
  const [{ worldBookService }, { characterCardService }, { presetService }] = await Promise.all([
    import('./worldBookService'),
    import('./characterCardService'),
    import('./presetService'),
  ]);

  return [
    {
      key: 'ST_CARDPLUS_WORLDBOOK_V1',
      service: worldBookService,
      label: '世界书',
    },
    {
      key: 'ST_CARDPLUS_CHARACTERCARD_V1',
      service: characterCardService,
      label: '角色卡',
    },
    {
      key: 'ST_CARDPLUS_PRESET_V1',
      service: presetService,
      label: '预设',
    },
  ];
}

/**
 * 导出所有已注册的数据库
 * @returns 包含所有数据库导出数据的对象，键为数据库标识符
 * @throws 如果任何数据库导出失败
 */
export async function exportAllDatabases(): Promise<Record<string, string>> {
  const data: Record<string, string> = {};
  const registeredDatabases = await getRegisteredDatabases();

  for (const { key, service, label } of registeredDatabases) {
    try {
      const exported = await service.exportDatabase();
      data[key] = JSON.stringify(exported);
    } catch (error) {
      console.error(`导出${label}数据失败:`, error);
      throw new Error(`导出${label}数据失败`);
    }
  }

  return data;
}

/**
 * 从数据对象中导入所有已注册的数据库
 * @param data 包含数据库导出数据的对象
 * @throws 如果任何数据库导入失败
 * @note 成功导入的数据库键会从 data 对象中删除，避免被写入 localStorage
 */
export async function importAllDatabases(data: Record<string, any>): Promise<void> {
  const registeredDatabases = await getRegisteredDatabases();

  for (const { key, service, label } of registeredDatabases) {
    if (data[key]) {
      try {
        const parsed = JSON.parse(data[key]);
        await service.importDatabase(parsed);
        delete data[key];
      } catch (error) {
        console.error(`导入${label}数据失败:`, error);
        throw new Error(`导入${label}数据失败`);
      }
    }
  }
}

/**
 * 清理对象使其可以被 IndexedDB 克隆
 * 移除不可序列化的属性(函数、Symbol、循环引用等)
 */
export function sanitizeForIndexedDB<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Failed to sanitize object for IndexedDB:', error);
    throw new Error('无法序列化对象以存储到数据库');
  }
}
