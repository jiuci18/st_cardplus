import { ElMessage } from 'element-plus';
import { isTauriApp, uploadImageToHostingViaTauri, type HostingProvider } from '@/utils/imageHosting';
import { getSetting } from '@/utils/localStorageUtils';
import type { Ref } from 'vue';

const ensureImgBBApiKey = async (): Promise<string | null> => {
  const cached = getSetting('imgbbApiKey').trim();
  if (cached) return cached;
  ElMessage.warning('请前往 设置，配置 ImgBB keys 后再试');
  return null;
};

export async function uploadImageFileToHosting(
  file: File,
  provider: HostingProvider | null | undefined
): Promise<string | null> {
  if (!isTauriApp()) {
    ElMessage.warning('该功能仅在桌面 APP 版本可用');
    return null;
  }

  if (!provider) {
    ElMessage.warning('请先选择图片上传驱动');
    return null;
  }

  let imgbbApiKey: string | undefined;
  if (provider === 'imgbb') {
    const key = await ensureImgBBApiKey();
    if (!key) {
      return null;
    }
    imgbbApiKey = key;
  }

  return uploadImageToHostingViaTauri(file, provider, imgbbApiKey);
}

export function useImageHosting(
  currentImageFile: Ref<File | null>,
  setCurrentSessionAvatarUrl: (url: string) => void
) {
  const handleUploadToHosting = async (provider: HostingProvider | null | undefined) => {
    if (!currentImageFile.value) {
      ElMessage.warning('请先选择一张本地头像图片');
      return;
    }

    try {
      const uploadedUrl = await uploadImageFileToHosting(currentImageFile.value, provider);
      if (!uploadedUrl) return;

      setCurrentSessionAvatarUrl(uploadedUrl);
      const providerLabel = provider === 'catbox' ? 'Catbox' : 'ImgBB';
      ElMessage.success(`上传到 ${providerLabel} 成功，已写入角色 image URL`);
    } catch (error) {
      const errorInfo =
        error instanceof Error
          ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
          : { raw: error };
      console.error('[ImageHosting] 上传失败 - 完整错误对象:', error);
      console.error('[ImageHosting] 上传失败 - 可读详情:', errorInfo);
      ElMessage.error(error instanceof Error ? error.message : '上传失败');
    }
  };

  return {
    handleUploadToHosting,
  };
}
