const UMAMI_SCRIPT_ID = 'umami-telemetry-script';
const UMAMI_SCRIPT_SRC = 'https://um.liushen.fun/script.js';
const UMAMI_WEBSITE_ID = 'e2d65258-b3c4-41f2-9111-c2086178373f';

type UmamiWindow = Window & {
  umami?: unknown;
};

let pendingLoad: Promise<void> | null = null;

const getExistingScript = () => document.getElementById(UMAMI_SCRIPT_ID) as HTMLScriptElement | null;

const loadUmamiScript = async (): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const existingScript = getExistingScript();
  if (existingScript?.dataset.loaded === 'true') {
    return;
  }

  if (pendingLoad) {
    return pendingLoad;
  }

  pendingLoad = new Promise<void>((resolve, reject) => {
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          pendingLoad = null;
          reject(new Error('Failed to load Umami script'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = UMAMI_SCRIPT_ID;
    script.defer = true;
    script.src = UMAMI_SCRIPT_SRC;
    script.dataset.websiteId = UMAMI_WEBSITE_ID;

    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        pendingLoad = null;
        resolve();
      },
      { once: true }
    );

    script.addEventListener(
      'error',
      () => {
        pendingLoad = null;
        script.remove();
        reject(new Error('Failed to load Umami script'));
      },
      { once: true }
    );

    document.head.appendChild(script);
  });

  return pendingLoad;
};

const unloadUmamiScript = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  pendingLoad = null;
  getExistingScript()?.remove();
  delete (window as UmamiWindow).umami;
};

export const syncUmamiTelemetry = async (enabled: boolean): Promise<void> => {
  if (enabled) {
    await loadUmamiScript();
    return;
  }

  unloadUmamiScript();
};
