//! JSONL-to-Markdown conversion utilities for chat-log novel export.

export interface JsonlConversionOptions {
  includeUser: boolean;
  includeTime: boolean;
  includeThinking: boolean;
  includeSummary: boolean;
  cleanMode: boolean;
}

export interface JsonlConversionResult {
  markdown: string;
  chapterCount: number;
  characterCount: number;
  outputFileName: string;
  characterName: string;
  userName: string;
  createDate: string;
}

interface JsonlMetaLine {
  character_name?: string;
  user_name?: string;
  create_date?: string;
}

interface JsonlMessageLine {
  is_user?: boolean;
  mes?: string;
  name?: string;
  send_date?: string;
  extra?: {
    model?: string;
  };
}

const DEFAULT_OPTIONS: JsonlConversionOptions = {
  includeUser: true,
  includeTime: true,
  includeThinking: false,
  includeSummary: false,
  cleanMode: false,
};

const normalizeNewlines = (text: string): string => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const deriveTitleFromFileName = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  const stem = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  return stem.replaceAll('_', ' ').replaceAll(' - ', ' — ');
};

const deriveOutputFileName = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  const stem = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  return `${stem}.md`;
};

const cleanMessage = (text: string, options: JsonlConversionOptions): string => {
  let cleaned = text;

  if (!options.includeThinking) {
    cleaned = cleaned.replace(/<thinking>.*?<\/thinking>/gs, '');
  }

  if (!options.includeSummary) {
    cleaned = cleaned.replace(/<details>.*?<\/details>/gs, '');
    cleaned = cleaned.replace(/<details>\s*<summary>.*$/gs, '');
    cleaned = cleaned.replace(/\n\n摘要\n.*$/gs, '');
  }

  cleaned = cleaned.replace(/<!--.*?-->/gs, '');
  cleaned = cleaned.replace(/<search_quality_reflection>.*?<\/search_quality_reflection>/gs, '');
  cleaned = cleaned.replace(/<search_quality_score>.*?<\/search_quality_score>/gs, '');
  cleaned = cleaned.replace(/<\/?output>/g, '');

  cleaned = cleaned.replace(/([。？！…）」』"〉】])\n(?=[\u4e00-\u9fff\w"「『（【〈A-Z])/g, '$1\n\n');
  cleaned = cleaned.replace(/([.?!]"?)\n(?=[\u4e00-\u9fff\w"「『（【〈A-Z])/g, '$1\n\n');
  cleaned = cleaned.replace(/(["」』])\n(?=["「『])/g, '$1\n\n');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  return cleaned.trim();
};

const ensureHeading = (text: string): string => {
  if (!text || text.startsWith('#') || text.startsWith('---')) {
    return text;
  }

  const [firstLine, ...restLines] = text.split('\n');
  const first = firstLine.trim();
  const rest = restLines.join('\n');

  if (first.length > 0 && first.length < 50) {
    return `### ${first}\n${rest}`.trimEnd();
  }

  return `---\n\n${text}`;
};

const parseJsonLine = <T>(line: string, lineNumber: number): T => {
  try {
    return JSON.parse(line) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown JSON parse error';
    throw new Error(`Line ${lineNumber} is not valid JSON: ${reason}`);
  }
};

/**
 * Convert a SillyTavern-style JSONL chat export into readable Markdown.
 *
 * Contract:
 * - The first non-empty line must be the metadata record.
 * - Remaining non-empty lines must be message records.
 * - Throws when the input is empty or when any line is invalid JSON.
 */
export function convertJsonlToMarkdown(
  input: string,
  fileName: string,
  options: Partial<JsonlConversionOptions> = {}
): JsonlConversionResult {
  const resolvedOptions: JsonlConversionOptions = { ...DEFAULT_OPTIONS, ...options };
  const normalized = normalizeNewlines(input);
  const lines = normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('The selected file is empty.');
  }

  const meta = parseJsonLine<JsonlMetaLine>(lines[0], 1);
  const title = deriveTitleFromFileName(fileName);
  const outputFileName = deriveOutputFileName(fileName);
  const characterName = meta.character_name || 'Unknown';
  const userName = meta.user_name || 'Unknown';
  const createDate = meta.create_date || '';

  const markdownParts: string[] = [];

  if (!resolvedOptions.cleanMode) {
    markdownParts.push(`# ${title}\n`);
    markdownParts.push(`**角色:** ${characterName}　|　**用户:** ${userName}　|　**创建:** ${createDate}\n`);
    markdownParts.push('---\n');
  }

  let chapterCount = 0;

  lines.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const data = parseJsonLine<JsonlMessageLine>(line, lineNumber);
    const message = (data.mes || '').trim();

    if (!message) {
      return;
    }

    if (data.is_user) {
      if (resolvedOptions.includeUser) {
        markdownParts.push(`\n> **〔${data.name || userName}〕** ${message}\n`);
      }
      return;
    }

    const cleaned = cleanMessage(message, resolvedOptions);
    if (!cleaned) {
      return;
    }

    chapterCount += 1;

    if (!resolvedOptions.cleanMode) {
      markdownParts.push(`\n## 第${chapterCount}章`);

      const infoParts: string[] = [];
      if (data.extra?.model) {
        infoParts.push(`模型: ${data.extra.model}`);
      }
      if (resolvedOptions.includeTime && data.send_date) {
        infoParts.push(data.send_date);
      }
      if (infoParts.length > 0) {
        markdownParts.push(`*${infoParts.join('　|　')}*\n`);
      }

      markdownParts.push(ensureHeading(cleaned));
      markdownParts.push('\n');
      return;
    }

    markdownParts.push('---\n\n');
    markdownParts.push(cleaned);
    markdownParts.push('\n\n');
  });

  const markdown = markdownParts.join('\n').trim() + '\n';

  return {
    markdown,
    chapterCount,
    characterCount: markdown.length,
    outputFileName,
    characterName,
    userName,
    createDate,
  };
}
