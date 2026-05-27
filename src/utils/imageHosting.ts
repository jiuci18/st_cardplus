import { stripCharacterCardMetadata } from "@/utils/pngCardMetadata";

export type HostingProvider = "catbox" | "imgbb" | "local";

export interface HostingProviderOption {
  label: string;
  value: HostingProvider;
}

export interface UploadImageResult {
  provider: HostingProvider;
  url: string;
  savedPath?: string;
}

interface UploadImageCommandResult {
  provider?: string;
  url?: string | null;
  saved_path?: string | null;
}

export const HOSTING_PROVIDER_OPTIONS: HostingProviderOption[] = [
  { label: "Catbox", value: "catbox" },
  { label: "ImgBB", value: "imgbb" },
  { label: "Local (App Data)", value: "local" },
];

export const getHostingProviderLabel = (provider: HostingProvider): string => {
  switch (provider) {
    case "catbox":
      return "Catbox";
    case "imgbb":
      return "ImgBB";
    case "local":
      return "Local";
  }
};

export const isHostingProvider = (value: unknown): value is HostingProvider => {
  return value === "catbox" || value === "imgbb" || value === "local";
};

import { isTauriApp } from "./system/tauri";
export { isTauriApp };

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const hasPngSignature = (bytes: Uint8Array): boolean =>
  bytes.length >= PNG_SIGNATURE.length &&
  PNG_SIGNATURE.every((value, index) => bytes[index] === value);

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const sanitizeImageBytesForUpload = async (
  file: File,
): Promise<Uint8Array> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPngFile =
    file.type === "image/png" ||
    file.name.toLowerCase().endsWith(".png") ||
    hasPngSignature(bytes);

  if (!isPngFile) {
    return bytes;
  }

  return stripCharacterCardMetadata(bytes);
};

const fileToBase64 = async (file: File): Promise<string> => {
  const sanitizedBytes = await sanitizeImageBytesForUpload(file);
  return bytesToBase64(sanitizedBytes);
};

const toHostingProvider = (value: string): HostingProvider => {
  const normalized = value.trim().toLowerCase();
  if (!isHostingProvider(normalized)) {
    throw new Error(`Unsupported hosting provider: ${value}`);
  }
  return normalized;
};

const buildLocalAssetUrl = async (savedPath: string): Promise<string> => {
  const normalizedPath = savedPath.trim();
  if (!normalizedPath) {
    throw new Error("本地图片保存成功，但未返回有效路径");
  }

  const { convertFileSrc } = await import("@tauri-apps/api/core");
  return convertFileSrc(normalizedPath);
};

export const uploadImageToHostingViaTauri = async (
  file: File,
  provider: HostingProvider,
  imgbbApiKey?: string,
): Promise<UploadImageResult> => {
  if (!isTauriApp()) {
    throw new Error("该功能仅在桌面 APP 版本可用");
  }

  const base64Data = await fileToBase64(file);
  const { invoke } = await import("@tauri-apps/api/core");

  const result = await invoke<UploadImageCommandResult>(
    "upload_image_to_hosting",
    {
      base64Data,
      base64_data: base64Data,
      fileName: file.name || "avatar.png",
      file_name: file.name || "avatar.png",
      mimeType: file.type || "image/png",
      mime_type: file.type || "image/png",
      provider,
      imgbbApiKey: imgbbApiKey || "",
      imgbb_api_key: imgbbApiKey || "",
    },
  );

  const resolvedProvider = toHostingProvider(
    String(result?.provider || provider),
  );
  const savedPath = String(result?.saved_path || "").trim() || undefined;
  let url = String(result?.url || "").trim();

  if (!url && resolvedProvider === "local" && savedPath) {
    url = await buildLocalAssetUrl(savedPath);
  }

  if (!url) {
    throw new Error("上传失败：图床返回为空");
  }

  return {
    provider: resolvedProvider,
    url,
    savedPath,
  };
};
