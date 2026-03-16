import { stripCharacterCardMetadata } from '@/utils/pngCardMetadata';

export type HostingProvider = 'catbox' | 'imgbb';

export const isTauriApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
};

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const hasPngSignature = (bytes: Uint8Array): boolean =>
  bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((value, index) => bytes[index] === value);

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const sanitizeImageBytesForUpload = async (file: File): Promise<Uint8Array> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPngFile = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png') || hasPngSignature(bytes);

  if (!isPngFile) {
    return bytes;
  }

  return stripCharacterCardMetadata(bytes);
};

const fileToBase64 = async (file: File): Promise<string> => {
  const sanitizedBytes = await sanitizeImageBytesForUpload(file);
  return bytesToBase64(sanitizedBytes);
};

export const uploadImageToHostingViaTauri = async (
  file: File,
  provider: HostingProvider,
  imgbbApiKey?: string
): Promise<string> => {
  if (!isTauriApp()) {
    throw new Error('该功能仅在桌面 APP 版本可用');
  }

  const base64Data = await fileToBase64(file);
  const { invoke } = await import('@tauri-apps/api/core');

  const result = await invoke<string>('upload_image_to_hosting', {
    base64Data,
    base64_data: base64Data,
    fileName: file.name || 'avatar.png',
    file_name: file.name || 'avatar.png',
    mimeType: file.type || 'image/png',
    mime_type: file.type || 'image/png',
    provider,
    imgbbApiKey: imgbbApiKey || '',
    imgbb_api_key: imgbbApiKey || '',
  });

  const url = String(result || '').trim();
  if (!url) {
    throw new Error('上传失败：图床返回为空');
  }

  return url;
};
