const DEFAULT_MULTI_VALUE_DELIMITER = /[\n\r\t,，;；、]+/;

function splitDelimitedValues(
  rawText: string,
  delimiterPattern: RegExp = DEFAULT_MULTI_VALUE_DELIMITER
): string[] {
  return rawText
    .split(delimiterPattern)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function mergeUniqueValues(existingValues: string[], incomingValues: string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const value of [...existingValues, ...incomingValues]) {
    const normalizedValue = value.trim();
    if (!normalizedValue || seen.has(normalizedValue)) continue;
    seen.add(normalizedValue);
    merged.push(normalizedValue);
  }

  return merged;
}

export function bindDelimitedPaste(
  rootElement: HTMLElement | null | undefined,
  onValues: (values: string[]) => void,
  delimiterPattern: RegExp = DEFAULT_MULTI_VALUE_DELIMITER
): (() => void) | null {
  const inputElement = rootElement?.querySelector('input');
  if (!inputElement) return null;

  const handlePaste = (event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData('text') ?? '';
    if (!pastedText) return;

    const values = splitDelimitedValues(pastedText, delimiterPattern);
    if (values.length <= 1) return;

    event.preventDefault();
    onValues(values);

    inputElement.value = '';
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  };

  inputElement.addEventListener('paste', handlePaste);

  return () => {
    inputElement.removeEventListener('paste', handlePaste);
  };
}
