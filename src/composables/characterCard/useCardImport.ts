import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { read as readPngMetadata } from '@/utils/pngCardMetadata';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';

/**
 * 一个轻量级的 Hook，用于处理角色卡编辑器中的 PNG 导入和图片预览。
 * 主要功能包括：
 * 1. 触发文件选择器。
 * 2. 当用户选择文件后，解析 PNG 文件，提取角色卡数据。
 * 3. 如果解析成功，调用回调函数加载角色卡数据到编辑器。
 * 4. 如果解析失败，将图片作为新角色卡的头像。
 * 5. 管理上传状态。
 */
export function useCardImport(
  loadCharacter: (character: CharacterCardV3) => void,
  handleImageUpdate: (file: File) => void
) {
  const isUploading = ref(false);
  const uploadProgress = ref('');

  const handleFileSelected = async (file: File) => {
    if (!file) {
      console.warn('useCardImport: No file selected');
      return;
    }

    if (!file.type.startsWith('image/')) {
      ElMessage.error('请选择有效的图片文件');
      return;
    }

    if (!file.type.includes('png')) {
      ElMessage.error('智能导入功能仅支持PNG文件');
      return;
    }

    isUploading.value = true;
    uploadProgress.value = '正在分析图片...';

    try {
      const extractCharacterData = async (file: File): Promise<CharacterCardV3 | null> => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const image = new Uint8Array(arrayBuffer);
          const jsonData = readPngMetadata(image);
          return JSON.parse(jsonData);
        } catch (error) {
          console.log('No valid character data found in PNG metadata.', error);
          return null;
        }
      };

      const characterCardData = await extractCharacterData(file);

      if (characterCardData) {
        // 如果 PNG 包含元数据，则加载角色卡
        uploadProgress.value = '正在加载角色卡...';
        loadCharacter(characterCardData);
        handleImageUpdate(file); // 同时更新图片预览
        ElMessage.success(
          `角色卡 "${characterCardData.name || (characterCardData.data as any)?.name || '未命名'}" 已成功加载！`
        );
      } else {
        // 如果 PNG 不包含元数据，则仅将其作为图片使用
        uploadProgress.value = '正在加载图片...';
        handleImageUpdate(file);
        ElMessage.success('图片已加载，可作为新角色卡的头像。');
      }
    } catch (error) {
      console.error('useCardImport: Error in smart import:', error);
      ElMessage.error(`加载失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      isUploading.value = false;
      uploadProgress.value = '';
    }
  };

  return {
    isUploading,
    uploadProgress,
    handleFileSelected,
  };
}
