import { ElMessage } from 'element-plus';
import { write as writePngCard } from '@/utils/pngCardMetadata';
import { saveFile } from '@/utils/fileSave';
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

async function resolveImageBuffer(
  imageSourceUrl: string | undefined,
  characterImageFile: File | null
): Promise<Uint8Array> {
  if (imageSourceUrl) {
    const response = await fetch(imageSourceUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`获取图片失败（HTTP ${response.status}）`);
    }
    const blob = await response.blob();
    return blobToPngBuffer(blob);
  }

  if (characterImageFile) {
    return blobToPngBuffer(characterImageFile);
  }

  throw new Error('请先加载或选择一张图片作为角色卡背景');
}

export function useCardExport(
  characterData: Ref<CharacterCardV3>,
  characterImageFile: Ref<File | null>,
  imageSourceUrl: Ref<string | undefined>
) {
  const handleSave = async () => {
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

      const imageBuffer = await resolveImageBuffer(imageSourceUrl.value, characterImageFile.value);
      const jsonDataString = JSON.stringify(exportData, null, 2);
      const newImageBuffer = writePngCard(imageBuffer, jsonDataString);
      const properBuffer = new Uint8Array(newImageBuffer);
      const rawName = String(exportData.data?.name || exportData.name || 'character').trim();
      const fileName = rawName.toLowerCase().endsWith('.png') ? rawName : `${rawName}.png`;
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
      console.error('useCardExport: Failed to save character card:', error);
      ElMessage.error(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return {
    handleSave,
  };
}
