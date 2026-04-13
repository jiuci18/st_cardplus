import { ElMessage, ElMessageBox } from 'element-plus';
import { formatDateTime } from '@/utils/datetime';
import type { GistInfo } from '@/types/gist';

export async function confirmPush(): Promise<boolean> {
  try {
    await ElMessageBox.confirm('确定要将本地数据推送到云端吗？这将覆盖云端上已有的备份。', '确认推送', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    return true;
  } catch {
    ElMessage.info('推送操作已取消');
    return false;
  }
}

export async function confirmPull(backupTimestamp: string, snapshotSaved?: boolean): Promise<boolean> {
  const snapshotWarning = snapshotSaved === false
    ? '<br/><span style="color: var(--el-color-danger);">缓存区域超限，无法保存撤销快照，本次无法撤销。</span>'
    : '';

  try {
    await ElMessageBox.confirm(
      `这将用服务器上的备份覆盖所有现有本地数据<br/>
      <strong>备份时间:</strong> ${formatDateTime(backupTimestamp)}<br/>
      此操作可能会丢失你没有保存的更改 您确定要继续吗？${snapshotWarning}`,
      '警告',
      {
        confirmButtonText: '确认覆盖',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true,
      }
    );
    return true;
  } catch {
    ElMessage.info('操作已取消');
    return false;
  }
}

export async function confirmLargeRevert(snapshotSizeBytes: number): Promise<boolean> {
  if (snapshotSizeBytes <= 4500 * 1024) return true;

  try {
    await ElMessageBox.confirm(
      '当前 APP 数据内容已超出 浏览器 缓冲区有效容量，恢复系统运作可能运作不如意',
      '警告',
      { confirmButtonText: '仍然继续', cancelButtonText: '取消', type: 'warning' }
    );
    return true;
  } catch {
    ElMessage.info('操作已取消');
    return false;
  }
}

export async function selectGist(gists: GistInfo[], currentGistId: string): Promise<string | null> {
  const gistOptions = gists
    .map(
      (g) =>
        `<div style="margin-bottom: 10px; padding: 8px; background: var(--el-fill-color-light); border-radius: 4px; cursor: pointer;" onclick="this.querySelector('input').checked = true">
          <label style="display: flex; align-items: center; width: 100%; cursor: pointer;">
            <input type="radio" name="gistSelection" value="${g.id}" style="margin-right: 10px;" ${
          g.id === currentGistId ? 'checked' : ''
        }>
            <div>
              <strong>ID:</strong> ${g.id}<br/>
              <strong>描述:</strong> ${g.description || '无描述'}<br/>
              <strong>更新:</strong> ${formatDateTime(g.updated_at)}
            </div>
          </label>
        </div>`
    )
    .join('');

  let selectedGistId: string | null = null;

  try {
    await ElMessageBox.confirm(
      `<div class="gist-selection-container" style="max-height: 400px; overflow-y: auto;">${gistOptions}</div>`,
      '选择一个 Gist 用于同步',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '选定',
        cancelButtonText: '取消',
        beforeClose: (action, _instance, done) => {
          if (action === 'confirm') {
            const selectedRadio = document.querySelector('.gist-selection-container input[name="gistSelection"]:checked');
            if (selectedRadio) {
              selectedGistId = (selectedRadio as HTMLInputElement).value;
              done();
              return;
            }
            ElMessage.warning('您没有选择任何 Gist');
            return;
          }
          done();
        },
      }
    );
  } catch {
    ElMessage.info('已取消选择');
  }

  return selectedGistId;
}
