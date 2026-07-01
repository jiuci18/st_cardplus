import { localStorageStore } from "../localStorageUtils";
import { isTauriApp } from "./tauri";

export interface SaveFileOptions {
  data: Uint8Array;
  fileName: string;
  mimeType?: string;
  rememberDirKey?: string;
  quickSave?: boolean;
}

export interface SaveFileResult {
  savedPath?: string;
  savedDir?: string;
  usedDialog?: boolean;
  canceled?: boolean;
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const browserDownload = (
  data: Uint8Array,
  fileName: string,
  mimeType: string,
): SaveFileResult => {
  const copied = new Uint8Array(data.byteLength);
  copied.set(data);
  const blob = new Blob([copied], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return {};
};

export async function saveFile(
  options: SaveFileOptions,
): Promise<SaveFileResult> {
  const mimeType = options.mimeType || "application/octet-stream";

  if (!isTauriApp()) {
    return browserDownload(options.data, options.fileName, mimeType);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  const storageKey = options.rememberDirKey || "save.defaultDir";
  const defaultDir = localStorageStore.get(storageKey) || "";
  const base64Data = bytesToBase64(options.data);

  try {
    const result = await invoke<{
      saved_path: string;
      saved_dir: string;
      used_dialog: boolean;
    }>("save_binary_file", {
      base64Data,
      base64_data: base64Data,
      fileName: options.fileName,
      file_name: options.fileName,
      defaultDir,
      default_dir: defaultDir,
      quickSave: options.quickSave ?? true,
      quick_save: options.quickSave ?? true,
    });

    const savedDir = String(result?.saved_dir || "").trim();
    if (savedDir) {
      localStorageStore.set(storageKey, savedDir);
    }

    return {
      savedPath: String(result?.saved_path || ""),
      savedDir,
      usedDialog: !!result?.used_dialog,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "");
    if (message.includes("用户取消保存")) {
      return { canceled: true };
    }
    throw error;
  }
}
