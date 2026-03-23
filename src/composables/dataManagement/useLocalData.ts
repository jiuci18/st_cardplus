import { ElMessage, ElMessageBox } from 'element-plus';
import { resetAppDatabase, exportAllDatabases, importAllDatabases } from '@/database/utils';
import { nowIso } from '@/utils/datetime';
import { saveFile } from '@/utils/fileSave';

export function useLocalData(updateStorageInfo: () => Promise<void>) {
  const collectLocalStorageData = () => {
    const data: { [key: string]: any } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key);
    }
    return data;
  };

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'));
      reader.readAsText(file);
    });

  const exportData = async () => {
    try {
      const data = collectLocalStorageData();

      try {
        const dbData = await exportAllDatabases();
        Object.assign(data, dbData);
      } catch (error) {
        ElMessage.error(`${error instanceof Error ? error.message : '导出数据库失败'}，请检查控制台获取详细信息`);
        return;
      }

      const json = JSON.stringify(data, null, 2);
      await saveFile({
        data: new TextEncoder().encode(json),
        fileName: `st-cardplus-backup-${nowIso().slice(0, 10)}.json`,
        mimeType: 'application/json',
      });

      ElMessage.success('数据已成功导出');
    } catch (error) {
      console.error('导出数据失败:', error);
      ElMessage.error('导出数据失败');
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const json = await readFileAsText(file);
        const data = JSON.parse(json);

        try {
          await ElMessageBox.confirm(
            '这将用导入文件中的数据覆盖所有现有本地数据（包括世界书），此操作无法撤销您确定要继续吗？',
            '警告',
            {
              confirmButtonText: '确认导入',
              cancelButtonText: '取消',
              type: 'warning',
            }
          );
        } catch (error) {
          ElMessage.info('导入操作已取消');
          return;
        }

        try {
          await importAllDatabases(data);

          localStorage.clear();
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              localStorage.setItem(key, data[key]);
            }
          }

          ElMessage.success('数据已成功导入，应用将重新加载以应用更改');
          await updateStorageInfo();
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (importError) {
          console.error('导入处理失败:', importError);
          ElMessage.error('导入过程中发生错误，操作已终止');
        }
      } catch (error) {
        console.error('导入数据失败:', error);
        ElMessage.error('导入数据失败，文件格式可能不正确 ');
      }
    };
    input.click();
  };

  const clearAllData = () => {
    ElMessageBox.confirm(
      '您确定要清除所有本地数据吗？此操作将删除所有角色卡、设置以及世界书，且无法撤销',
      '高危操作警告',
      {
        confirmButtonText: '确认清除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(async () => {
        try {
          await resetAppDatabase();
          localStorage.clear();

          ElMessage.success('所有本地数据已清除并重建数据库，应用将重新加载');
          await updateStorageInfo();
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (error) {
          console.error('清除所有数据失败:', error);
          ElMessage.error('清除数据时发生错误');
        }
      })
      .catch(() => {
        ElMessage.info('操作已取消');
      });
  };

  return {
    exportData,
    importData,
    clearAllData,
  };
}
