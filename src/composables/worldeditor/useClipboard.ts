import { ElMessage } from 'element-plus';
import { copyToClipboard } from '@/utils/clipboard';
import { cleanObject } from '@/utils/objectUtils';
import type { Project, EnhancedLandmark, EnhancedForce } from '@/types/world-editor';
import type { Ref } from 'vue';

type WorldEditorItem = Project | EnhancedLandmark | EnhancedForce;

export function useClipboard(selectedItem: Ref<WorldEditorItem | null>, updateSelectedItem: (data: any) => void) {
  const sanitizeItem = (item: any) => {
    return cleanObject(item, ['id', 'createdAt', 'updatedAt', 'version'], ['_']);
  };

  const handleCopyToClipboard = async () => {
    if (!selectedItem.value) return;
    const cleanItem = sanitizeItem(selectedItem.value);
    const dataStr = JSON.stringify(cleanItem, null, 2);
    await copyToClipboard(dataStr);
  };

  const handleImportFromClipboard = (data: string) => {
    try {
      const importedData = JSON.parse(data);
      updateSelectedItem(importedData);
    } catch (error) {
      ElMessage.error('无效的JSON格式 ');
    }
  };

  return {
    handleCopyToClipboard,
    handleImportFromClipboard,
  };
}
