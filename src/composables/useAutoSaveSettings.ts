import { onScopeDispose, ref } from 'vue';
import { getSetting } from '../utils/localStorageUtils.ts';

export type AutoSaveMode = 'auto' | 'watch' | 'manual';

interface AutoSaveSettingsOptions {
  autoSaveIntervalMs?: number;
  watchDebounceMs?: number;
}

export function useAutoSaveSettings(options: AutoSaveSettingsOptions = {}) {
  const intervalMs = ref(options.autoSaveIntervalMs ?? getSetting('autoSaveInterval') * 1000);
  const debounceMs = ref(options.watchDebounceMs ?? getSetting('autoSaveDebounce') * 1000);

  const listen = (eventName: string, target: typeof intervalMs) => {
    const handler = (event: Event) => {
      const value = (event as CustomEvent<number>).detail;
      if (typeof value === 'number' && Number.isFinite(value)) target.value = value * 1000;
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  };
  const stopInterval = listen('autoSaveIntervalChange', intervalMs);
  const stopDebounce = listen('autoSaveDebounceChange', debounceMs);
  const cleanup = () => {
    stopInterval();
    stopDebounce();
  };
  onScopeDispose(cleanup);

  return { intervalMs, debounceMs, cleanup };
}

export function nextAutoSaveMode(mode: AutoSaveMode): AutoSaveMode {
  const modes: AutoSaveMode[] = ['auto', 'watch', 'manual'];
  return modes[(modes.indexOf(mode) + 1) % modes.length];
}

export function autoSaveModeMessage(mode: AutoSaveMode, intervalMs: number, debounceMs: number): string {
  const messages = {
    auto: `已切换到自动保存模式：每 ${Math.max(1, Math.round(intervalMs / 1000))} 秒自动保存`,
    watch: `已切换到监听模式：检测到修改后 ${Math.max(0.1, Math.round((debounceMs / 1000) * 10) / 10)} 秒自动保存`,
    manual: '已切换到手动模式：自动保存已禁用',
  };
  return messages[mode];
}
