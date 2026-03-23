const isTauriApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
};

const isModifiedEvent = (event: MouseEvent): boolean => {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
};

const resolveExternalHttpUrl = (rawHref: string | null): string | null => {
  const href = rawHref?.trim();
  if (!href || !/^https?:\/\//i.test(href)) {
    return null;
  }

  try {
    return new URL(href).toString();
  } catch {
    return null;
  }
};

const openInBrowser = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export async function openExternalUrl(rawUrl: string): Promise<void> {
  const url = resolveExternalHttpUrl(rawUrl);
  if (!url) {
    throw new Error('仅支持打开 http 或 https 链接');
  }

  if (!isTauriApp()) {
    openInBrowser(url);
    return;
  }

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_external_url', { url });
}

export function installExternalLinkInterceptor(root: Document = document): () => void {
  const handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || isModifiedEvent(event)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) {
      return;
    }

    const shouldIntercept =
      anchor.dataset.externalLink === 'true' ||
      anchor.getAttribute('target') === '_blank' ||
      anchor.rel.split(/\s+/).includes('external');

    if (!shouldIntercept) {
      return;
    }

    const url = resolveExternalHttpUrl(anchor.getAttribute('href'));
    if (!url) {
      return;
    }

    event.preventDefault();
    void openExternalUrl(url).catch((error) => {
      console.error('打开外部链接失败:', error);
    });
  };

  root.addEventListener('click', handleClick, true);
  return () => {
    root.removeEventListener('click', handleClick, true);
  };
}
