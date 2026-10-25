import { SUBSTITUTE_FIND_REGEX, type SillyTavernRegexScript } from './types.ts';

/** Build an independent script draft, excluding collection-only metadata. */
export function normalizeRegexScript(
  script: Partial<SillyTavernRegexScript> | null | undefined,
  defaults: { id: string; scriptName?: string },
): SillyTavernRegexScript {
  return {
    id: typeof script?.id === 'string' && script.id.trim() ? script.id : defaults.id,
    scriptName: typeof script?.scriptName === 'string' && script.scriptName.trim()
      ? script.scriptName : defaults.scriptName ?? '',
    findRegex: typeof script?.findRegex === 'string' ? script.findRegex : '',
    replaceString: typeof script?.replaceString === 'string' ? script.replaceString : '',
    trimStrings: Array.isArray(script?.trimStrings) ? script.trimStrings.map(String) : [],
    placement: Array.isArray(script?.placement) ? [...script.placement] : [],
    disabled: Boolean(script?.disabled),
    markdownOnly: Boolean(script?.markdownOnly),
    promptOnly: Boolean(script?.promptOnly),
    runOnEdit: Boolean(script?.runOnEdit),
    substituteRegex: typeof script?.substituteRegex === 'number' ? script.substituteRegex : SUBSTITUTE_FIND_REGEX.NONE,
    minDepth: typeof script?.minDepth === 'number' ? script.minDepth : null,
    maxDepth: typeof script?.maxDepth === 'number' ? script.maxDepth : null,
  };
}
