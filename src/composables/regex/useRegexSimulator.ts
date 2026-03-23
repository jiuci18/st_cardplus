/**
 * 本文件包含了用于正则表达式模拟运行的 Vue Composable
 * @copyright 所有文件修改来自 https://github.com/SillyTavern/SillyTavern/tree/release/public/scripts/extensions/regex 修改后处理
 */

import { ref, computed, unref, type MaybeRef } from 'vue';

/**
 * Instantiates a regular expression from a string (e.g., "/regex/ig").
 * @param {string} input The input string.
 * @returns {RegExp|undefined} The regular expression instance or undefined if invalid.
 * @copyright Originally from: https://github.com/IonicaBizau/regex-parser.js/blob/master/lib/index.js
 */
function regexFromString(input: string): RegExp | undefined {
  try {
    const m = input.match(/(\/?)(.+)\1([a-z]*)/i);
    if (!m) return new RegExp(input);

    if (m[3] && !/^(?!.*?(.).*?\1)[gmixXsuUAJ]+$/.test(m[3])) {
      return new RegExp(input);
    }

    return new RegExp(m[2] || '', m[3] || '');
  } catch {
    return undefined;
  }
}

/**
 * Filters anything to trim from the regex match.
 * @param {string} rawString The raw string to filter.
 * @param {string[]} trimStrings The strings to trim.
 * @returns {string} The filtered string.
 */
/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function filterString(rawString: string, trimStrings: string[]): string {
  if (!trimStrings || trimStrings.length === 0) {
    return rawString;
  }
  let finalString = rawString;
  trimStrings.forEach((trimString) => {
    // In this context, we don't need substituteParams for trimString,
    // as we assume they are literal strings for the simulator.
    if (trimString) {
      finalString = finalString.replace(new RegExp(escapeRegex(trimString), 'g'), '');
    }
  });
  return finalString;
}

/**
 * A lightweight macro replacer.
 * Replaces {{macro}} parameters in a string with values from a key-value object.
 * @param content The string to substitute parameters in.
 * @param macros A record object of macros, e.g., { "{{user}}": "John" }.
 * @returns The string with substituted parameters.
 */
function lightweightSubstitute(content: string, macros: Record<string, string>): string {
  if (!macros) {
    return content;
  }
  let result = content;
  for (const key of Object.keys(macros)) {
    if (result.includes(key)) {
      result = result.replace(new RegExp(escapeRegex(key), 'g'), macros[key] || '');
    }
  }
  return result;
}

import { SUBSTITUTE_FIND_REGEX, type RegexScript } from './types';

// From temp/regex/engine.js
function sanitizeRegexMacro(x: any): any {
  return x && typeof x === 'string'
    ? x.replaceAll(/[\n\r\t\v\f\0.^$*+?{}[\]\\/|()]/gs, function (s: string) {
        switch (s) {
          case '\n':
            return '\\n';
          case '\r':
            return '\\r';
          case '\t':
            return '\\t';
          case '\v':
            return '\\v';
          case '\f':
            return '\\f';
          case '\0':
            return '\\0';
          default:
            return '\\' + s;
        }
      })
    : x;
}

/**
 * Runs the provided regex script on the given string.
 * This is a modified version of the original runRegexScript from engine.js.
 * @param {RegexScript} regexScript The regex script to run.
 * @param {string} rawString The string to run the regex script on.
 * @returns {string} The new string.
 */
function runRegexScript(regexScript: RegexScript, rawString: string): string {
  if (!regexScript || !regexScript.findRegex || typeof rawString !== 'string') {
    return rawString;
  }

  // Handle substituteRegex to build the final regex string
  const getRegexString = () => {
    switch (regexScript.substituteRegex) {
      case SUBSTITUTE_FIND_REGEX.NONE:
        return regexScript.findRegex;
      case SUBSTITUTE_FIND_REGEX.RAW:
        // For the simulator, we use lightweightSubstitute on the regex string itself
        return lightweightSubstitute(regexScript.findRegex, regexScript.macros || {});
      case SUBSTITUTE_FIND_REGEX.ESCAPED: {
        const escapedMacros: Record<string, string> = {};
        if (regexScript.macros) {
          for (const key in regexScript.macros) {
            escapedMacros[key] = sanitizeRegexMacro(regexScript.macros[key]);
          }
        }
        return lightweightSubstitute(regexScript.findRegex, escapedMacros);
      }
      default:
        // Default to NONE if undefined or invalid
        return regexScript.findRegex;
    }
  };

  const regexString = getRegexString();
  const findRegex = regexFromString(regexString);

  if (!findRegex) {
    // Invalid regex, return original string
    return rawString;
  }

  // Run replacement
  const newString = rawString.replace(findRegex, function (match, ...args: any[]) {
    // args will be [p1, p2, ..., offset, string, groups?]
    const fullArgs = [match, ...args];
    const groups =
      typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null ? args[args.length - 1] : null;

    // Replace {{match}} with $0 for compatibility
    const replaceString = regexScript.replaceString.replace(/{{match}}/gi, '$0');

    const replaceWithGroups = replaceString.replaceAll(
      /\$(\d+)|\$<([^>]+)>/g,
      (_match: string, numStr?: string, groupName?: string) => {
        let matchedValue: string | undefined;

        if (numStr) {
          // Handle numbered capture groups ($0, $1, $2, etc.)
          const num = parseInt(numStr, 10);
          matchedValue = fullArgs[num];
        } else if (groupName && groups) {
          // Handle named capture groups ($<name>)
          matchedValue = groups[groupName];
        }

        if (matchedValue === undefined) {
          return ''; // Group not found
        }

        // Trim the matched group content if trimStrings are provided
        const filteredMatch = filterString(matchedValue, regexScript.trimStrings || []);
        return filteredMatch;
      }
    );

    // After handling capture groups, apply lightweight macro substitution to the result
    return lightweightSubstitute(replaceWithGroups, regexScript.macros || {});
  });

  return newString;
}

/**
 * A Vue Composable for simulating regular expression replacements.
 *
 * @param {Ref<RegexScript>} script - A ref containing the regex script configuration.
 * @returns {{ simulatedResult: ComputedRef<string>, testString: Ref<string> }}
 */
export function useRegexSimulator(script: MaybeRef<RegexScript>) {
  const testString = ref('');

  const simulatedResult = computed(() => {
    const currentScript = unref(script);
    if (!currentScript || !currentScript.findRegex) {
      return testString.value;
    }
    return runRegexScript(currentScript, testString.value);
  });

  return {
    testString,
    simulatedResult,
  };
}
