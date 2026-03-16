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

export function useImageHosting(
  currentImageFile: Ref<File | null>,
  setCurrentSessionAvatarUrl: (url: string) => void
) {
  const isDesktopApp = isTauriApp();

  const handleUploadToHosting = async (provider: HostingProvider) => {
    if (!isDesktopApp) {
      ElMessage.warning('该功能仅在桌面 APP 版本可用');
      return;
    }

    if (!currentImageFile.value) {
      ElMessage.warning('请先选择一张本地头像图片');
      return;
    }

    try {
      let imgbbApiKey: string | undefined;
      if (provider === 'imgbb') {
        const key = await ensureImgBBApiKey();
        if (!key) {
          return;
        }
        imgbbApiKey = key;
      }

      const uploadedUrl = await uploadImageToHostingViaTauri(currentImageFile.value, provider, imgbbApiKey);
      setCurrentSessionAvatarUrl(uploadedUrl);
      ElMessage.success(`上传到 ${provider === 'catbox' ? 'Catbox' : 'ImgBB'} 成功，已写入角色 image URL`);
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
