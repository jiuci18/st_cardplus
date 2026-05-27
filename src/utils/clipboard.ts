import { ElMessage } from 'element-plus';

/**
 * 使用传统方法复制文本（降级方案）
 * @param text 要复制的文本
 */
function fallbackCopyToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @param successMessage 成功时显示的消息
 * @param errorMessage 失败时显示的消息
 */
export async function copyToClipboard(
  text: string,
  successMessage: string = '已复制到剪贴板',
  errorMessage: string = '复制失败'
) {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ElMessage.success(successMessage);
      return;
    }

    console.warn('navigator.clipboard 不可用，使用降级方案');
    const success = fallbackCopyToClipboard(text);

    if (success) {
      ElMessage.success(successMessage);
    } else {
      throw new Error('错误，无法处理的问题');
    }
  } catch (error) {
    console.error('复制到剪贴板时出错:', error);
    ElMessage.error(errorMessage);
  }
}
