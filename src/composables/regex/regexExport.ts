import type { SillyTavernRegexScript, RegexScriptCollection } from './types.ts';

export function findRegexScript(collection: RegexScriptCollection, scriptId: string) {
  for (const category of Object.values(collection.categories)) {
    const script = category.scripts.find((script) => script.id === scriptId);
    if (script) return script;
  }
}

export function prepareRegexExport(script: SillyTavernRegexScript) {
  const data = { ...script };
  delete data.categoryId;
  if (data.minDepth === null) delete data.minDepth;
  if (data.maxDepth === null) delete data.maxDepth;
  return {
    data: JSON.stringify(data, null, 2),
    fileName: `${script.scriptName.replace(/[\s./\\?*]/g, '_') || 'regex-script'}.json`,
  };
}
