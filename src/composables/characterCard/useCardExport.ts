import { ElMessage } from 'element-plus';
import { write as writePngCard } from '@/utils/pngCardMetadata';
import { saveFile } from '@/utils/system/fileSave';
import { fetchImageBlob } from '@/utils/binaryFetch';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';
import type { Ref } from 'vue';

async function blobToPngBuffer(blob: Blob): Promise<Uint8Array> {
  if (blob.type === 'image/png') {
    return new Uint8Array(await blob.arrayBuffer());
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片解码失败'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法创建图片导出上下文');
    }

    context.drawImage(img, 0, 0);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('图片转 PNG 失败'));
          return;
        }
        resolve(result);
      }, 'image/png');
    });

    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const normalizeImageUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') return undefined;
  return trimmed;
};

const getCharacterImageUrl = (character: CharacterCardV3): string | undefined => {
  const candidates = [
    character.avatar,
    character.data?.avatar,
    character.data?.image,
    character.data?.extensions?.image,
  ];

  return candidates.map(normalizeImageUrl).find((url): url is string => !!url);
};

async function resolveImageBuffer(
  characterImageFile: File | null,
  imageSourceUrl: string | undefined
): Promise<Uint8Array> {
  if (characterImageFile) {
    return blobToPngBuffer(characterImageFile);
  }

  if (imageSourceUrl) {
    const blob = await fetchImageBlob(imageSourceUrl, { cache: 'no-store' });
    return blobToPngBuffer(blob);
  }

  throw new Error('请先加载或选择一张图片作为角色卡背景');
}

export function useCardExport(
  characterData: Ref<CharacterCardV3>,
  characterImageFile: Ref<File | null>,
  imageSourceUrl: Ref<string | undefined>
) {
  const handleSave = async () => {
    // 显示处理中提示
    const loadingMessage = ElMessage.info({
      message: '正在处理角色卡，请稍候...',
      duration: 0,
      showClose: false,
    });

    try {
      // 导出前从 data 层同步到顶层（确保导出的 JSON 兼容性）
      const exportData = {
        ...characterData.value,
        data: {
          ...characterData.value.data,
        },
      };
      if (exportData.data) {
        exportData.name = exportData.data.name ?? '';
        exportData.description = exportData.data.description ?? '';
        exportData.personality = exportData.data.personality ?? '';
        exportData.scenario = exportData.data.scenario ?? '';
        exportData.first_mes = exportData.data.first_mes ?? '';
        exportData.mes_example = exportData.data.mes_example ?? '';
        exportData.tags = exportData.data.tags ?? [];
      }

      const resolvedImageUrl = normalizeImageUrl(imageSourceUrl.value) || getCharacterImageUrl(characterData.value);

      // 如果需要从远程下载图片，更新提示信息
      if (!characterImageFile.value && resolvedImageUrl) {
        loadingMessage.close();
        const downloadingMessage = ElMessage.info({
          message: '正在下载远程图片...',
          duration: 0,
          showClose: false,
        });

        try {
          const imageBuffer = await resolveImageBuffer(characterImageFile.value, resolvedImageUrl);
          downloadingMessage.close();

          const processingMessage = ElMessage.info({
            message: '正在生成 PNG 文件...',
            duration: 0,
            showClose: false,
          });

          const jsonDataString = JSON.stringify(exportData, null, 2);
          const newImageBuffer = writePngCard(imageBuffer, jsonDataString);
          const properBuffer = new Uint8Array(newImageBuffer);
          const rawName = String(exportData.data?.name || exportData.name || 'character').trim();
          const fileName = rawName.toLowerCase().endsWith('.png') ? rawName : `${rawName}.png`;

          processingMessage.close();

          const result = await saveFile({
            data: properBuffer,
            fileName,
            mimeType: 'image/png',
            rememberDirKey: 'save.defaultDir',
            quickSave: true,
          });

          if (result.canceled) {
            ElMessage.info('已取消导出');
            return;
          }

          if (result.savedPath) {
            ElMessage.success(`导出成功：${result.savedPath}`);
          } else {
            ElMessage.success('角色卡已成功导出为 PNG');
          }
        } catch (error) {
          downloadingMessage.close();
          throw error;
        }
      } else {
        const imageBuffer = await resolveImageBuffer(characterImageFile.value, resolvedImageUrl);
        const jsonDataString = JSON.stringify(exportData, null, 2);
        const newImageBuffer = writePngCard(imageBuffer, jsonDataString);
        const properBuffer = new Uint8Array(newImageBuffer);
        const rawName = String(exportData.data?.name || exportData.name || 'character').trim();
        const fileName = rawName.toLowerCase().endsWith('.png') ? rawName : `${rawName}.png`;

        loadingMessage.close();

        const result = await saveFile({
          data: properBuffer,
          fileName,
          mimeType: 'image/png',
          rememberDirKey: 'save.defaultDir',
          quickSave: true,
        });

        if (result.canceled) {
          ElMessage.info('已取消导出');
          return;
        }

        if (result.savedPath) {
          ElMessage.success(`导出成功：${result.savedPath}`);
        } else {
          ElMessage.success('角色卡已成功导出为 PNG');
        }
      }
    } catch (error) {
      loadingMessage.close();
      console.error('useCardExport: Failed to save character card:', error);
      ElMessage.error(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return {
    handleSave,
  };
}
