//! Owns character-name preset loading, validation, caching, and rolling.

import { computed, ref, type ComputedRef } from "vue";
import { useStorage } from "@vueuse/core";
import { fetchJsonResource } from "@/utils/fetchResource";
import {
  parseCharacterNamePresetList,
  parseCharacterNameTable,
  rollCharacterName,
  type CharacterNamePreset,
  type CharacterNameTable,
} from "@/utils/characterNamePresets";

export interface NamePresetSettings {
  registries: string[];
  manualPresets: CharacterNamePreset[];
}

/** Identifies the operation that failed while loading a name preset. */
export type CharacterNamePresetLoadErrorCode =
  | "list_fetch_failed"
  | "table_fetch_failed"
  | "invalid_table"
  | "roll_in_progress"
  | "no_available_names";

/** Reports a typed failure from the name-preset loader. */
export class CharacterNamePresetLoadError extends Error {
  readonly code: CharacterNamePresetLoadErrorCode;

  constructor(code: CharacterNamePresetLoadErrorCode, message: string) {
    super(message);
    this.name = "CharacterNamePresetLoadError";
    this.code = code;
  }
}

/** Exposes read-only name-preset state and the operations that mutate it. */
export interface CharacterNamePresetController {
  readonly presets: ComputedRef<readonly CharacterNamePreset[]>;
  readonly isPresetListLoading: ComputedRef<boolean>;
  readonly presetListError: ComputedRef<string | null>;
  readonly rollingPresetLabel: ComputedRef<string | null>;
  readonly settings: ReturnType<typeof useStorage<NamePresetSettings>>;
  readonly loadPresetList: () => Promise<void>;
  readonly rollFromPreset: (
    preset: CharacterNamePreset,
    gender: string,
  ) => Promise<string>;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Creates an isolated name-preset loader with an in-memory table cache. */
export const useCharacterNamePresets = (): CharacterNamePresetController => {
  const mutablePresets = ref<readonly CharacterNamePreset[]>([]);
  const mutablePresetListLoading = ref(false);
  const mutablePresetListError = ref<string | null>(null);
  const mutableRollingPresetLabel = ref<string | null>(null);
  const tableCache = new Map<string, CharacterNameTable>();
  const settings = useStorage<NamePresetSettings>("character-name-preset-settings", {
    registries: ["/name_list.json"],
    manualPresets: [],
  });

  const loadPresetList = async (): Promise<void> => {
    mutablePresetListLoading.value = true;
    mutablePresetListError.value = null;

    try {
      const allPresets: CharacterNamePreset[] = [];

      // Fetch from all registries
      for (const registryUrl of settings.value.registries) {
        try {
          const { data } = await fetchJsonResource(registryUrl, {
            cache: "no-store",
          });
          const parsed = parseCharacterNamePresetList(data);
          allPresets.push(...parsed);
        } catch (error) {
          console.warn(`Failed to fetch registry: ${registryUrl}`, error);
        }
      }

      // Add manual presets
      allPresets.push(...settings.value.manualPresets);

      // Deduplicate by URL
      const uniquePresets = new Map<string, CharacterNamePreset>();
      for (const p of allPresets) {
        uniquePresets.set(p.url, p);
      }

      mutablePresets.value = Array.from(uniquePresets.values());

      if (mutablePresets.value.length === 0) {
        throw new Error("无可用预设 (No presets loaded)");
      }
    } catch (error) {
      const message = `Failed to load the name-preset list: ${errorMessage(error)}`;
      mutablePresets.value = [];
      mutablePresetListError.value = message;
      throw new CharacterNamePresetLoadError("list_fetch_failed", message);
    } finally {
      mutablePresetListLoading.value = false;
    }
  };

  const loadNameTable = async (
    preset: CharacterNamePreset,
  ): Promise<CharacterNameTable> => {
    const cached = tableCache.get(preset.url);
    if (cached) return cached;

    let data: unknown;
    try {
      ({ data } = await fetchJsonResource(preset.url));
    } catch (error) {
      throw new CharacterNamePresetLoadError(
        "table_fetch_failed",
        `Failed to load name preset "${preset.label}": ${errorMessage(error)}`,
      );
    }

    const result = parseCharacterNameTable(data);
    if (!result.ok) {
      throw new CharacterNamePresetLoadError(
        "invalid_table",
        `Name preset "${preset.label}" is invalid: ${result.error.message}`,
      );
    }

    tableCache.set(preset.url, result.value);
    return result.value;
  };

  const rollFromPreset = async (
    preset: CharacterNamePreset,
    gender: string,
  ): Promise<string> => {
    if (mutableRollingPresetLabel.value !== null) {
      throw new CharacterNamePresetLoadError(
        "roll_in_progress",
        "Another name roll is already in progress.",
      );
    }

    mutableRollingPresetLabel.value = preset.label;
    try {
      const table = await loadNameTable(preset);
      const name = rollCharacterName(table, gender);
      if (name === null) {
        throw new CharacterNamePresetLoadError(
          "no_available_names",
          `Name preset "${preset.label}" has no candidates outside its blacklist.`,
        );
      }
      return name;
    } finally {
      mutableRollingPresetLabel.value = null;
    }
  };

  return {
    presets: computed(() => mutablePresets.value),
    isPresetListLoading: computed(() => mutablePresetListLoading.value),
    presetListError: computed(() => mutablePresetListError.value),
    rollingPresetLabel: computed(() => mutableRollingPresetLabel.value),
    settings,
    loadPresetList,
    rollFromPreset,
  };
};
