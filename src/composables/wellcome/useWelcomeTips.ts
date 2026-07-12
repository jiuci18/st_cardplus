//! Loads and selects the rotating welcome-page tips.

import { ref, type Ref } from "vue";
import { fetchJsonResource } from "@/utils/fetchResource";

const defaultTips = ["提示加载失败，请点击“下一个”重试。"];

function normalizeTips(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (input && typeof input === "object" && "tips" in input) {
    const tips = (input as { tips?: unknown }).tips;
    if (Array.isArray(tips)) {
      return tips.map((item) => String(item).trim()).filter(Boolean);
    }
  }
  return [];
}

/** Owns the welcome-page tip collection and its random, non-repeating selection. */
export function useWelcomeTips(): {
  randomTip: Ref<string>;
  loadRemoteTips: () => Promise<void>;
  pickRandomTip: () => void;
} {
  const tips = ref<string[]>([...defaultTips]);
  const randomTip = ref("");

  const pickRandomTip = (): void => {
    if (tips.value.length === 0) {
      randomTip.value = "";
      return;
    }
    if (tips.value.length === 1) {
      randomTip.value = tips.value[0] ?? "";
      return;
    }

    let index = Math.floor(Math.random() * tips.value.length);
    while (tips.value[index] === randomTip.value) {
      index = Math.floor(Math.random() * tips.value.length);
    }
    randomTip.value = tips.value[index] ?? "";
  };

  const loadRemoteTips = async (): Promise<void> => {
    try {
      const { data } = await fetchJsonResource("/did-you-know.json", {
        cache: "no-store",
      });
      const loadedTips = normalizeTips(data);
      if (loadedTips.length > 0) tips.value = loadedTips;
    } catch {
      tips.value = [...defaultTips];
    }
  };

  return { randomTip, loadRemoteTips, pickRandomTip };
}

