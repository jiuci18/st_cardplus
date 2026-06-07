import { db, type StoredPresetFile } from '../db';
import { sanitizeForIndexedDB } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { getSessionStorageItem, setSessionStorageItem, removeSessionStorageItem } from '@/utils/localStorageUtils';

const ACTIVE_PRESET_ID_KEY = 'presetActiveId';

export const presetService = {
  async getAllPresets(): Promise<StoredPresetFile[]> {
    return await db.presets.orderBy('order').toArray();
  },

  async addPreset(preset: StoredPresetFile): Promise<void> {
    await db.presets.add(preset);
  },

  async updatePreset(preset: StoredPresetFile): Promise<void> {
    await db.presets.put(sanitizeForIndexedDB(preset));
  },

  async deletePreset(presetId: string): Promise<void> {
    await db.presets.delete(presetId);
  },

  async updatePresetOrder(presets: Pick<StoredPresetFile, 'id' | 'order' | 'updatedAt'>[]): Promise<void> {
    await db.transaction('rw', db.presets, async () => {
      for (const preset of presets) {
        await db.presets.update(preset.id, { order: preset.order, updatedAt: preset.updatedAt });
      }
    });
  },

  setActivePresetId(presetId: string | null): void {
    if (presetId) {
      setSessionStorageItem(ACTIVE_PRESET_ID_KEY, presetId);
    } else {
      removeSessionStorageItem(ACTIVE_PRESET_ID_KEY);
    }
  },

  getActivePresetId(): string | null {
    return getSessionStorageItem(ACTIVE_PRESET_ID_KEY);
  },

  createDefaultPresetData<T extends Record<string, any>>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  },

  createPresetId(): string {
    return uuidv4();
  },

  async exportDatabase(): Promise<{ presets: StoredPresetFile[] }> {
    const presets = await db.presets.toArray();
    return { presets };
  },

  async importDatabase(data: { presets: StoredPresetFile[] }): Promise<void> {
    await db.transaction('rw', db.presets, async () => {
      await db.presets.clear();
      if (data?.presets?.length) {
        await db.presets.bulkAdd(data.presets);
      }
    });
  },
};
