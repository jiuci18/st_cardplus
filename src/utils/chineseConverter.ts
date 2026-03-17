/**
 * 中文简繁转换工具
 * 使用 opencc-js 进行角色卡文本的简繁体转换
 */

import * as OpenCC from 'opencc-js';
import { read, write } from './pngCardMetadata';
import { saveFile } from './fileSave';

/**
 * 支持的转换配置
 */
export type ConversionConfig =
  | 'cn' // 简体化
  | 't' // 繁体化（OpenCC 标准）
  | 'tw' // 台湾正体
  | 'twp' // 台湾正体（含惯用词）
  | 'hk' // 香港繁体
  | 'jp'; // 日本新字体

/**
 * 转换方向配置（便于用户选择）
 */
export interface ConversionOption {
  value: ConversionConfig;
  label: string;
  description: string;
}

/**
 * 预定义的转换选项
 */
export const CONVERSION_OPTIONS: ConversionOption[] = [
  {
    value: 'cn',
    label: '转换为简体中文',
    description: '将文本转换为简体中文（大陆标准）',
  },
  {
    value: 't',
    label: '转换为繁体中文',
    description: '将文本转换为繁体中文（OpenCC 标准）',
  },
  {
    value: 'tw',
    label: '转换为台湾正体',
    description: '将文本转换为台湾正体中文',
  },
  {
    value: 'twp',
    label: '转换为台湾正体（惯用词）',
    description: '将文本转换为台湾正体中文，包含台湾惯用词汇',
  },
  {
    value: 'hk',
    label: '转换为香港繁体',
    description: '将文本转换为香港繁体中文',
  },
  {
    value: 'jp',
    label: '转换为日本新字体',
    description: '将文本转换为日本新字体（限汉字部分）',
  },
];

/**
 * 单个文件处理结果
 */
export interface ConversionResult {
  success: boolean;
  fileName: string;
  message?: string;
  convertedData?: Uint8Array;
  error?: Error;
}

/**
 * 递归转换对象中的所有字符串字段
 * @param obj 要转换的对象
 * @param converter OpenCC 转换器实例
 * @returns 转换后的对象
 */
function convertObjectStrings<T>(obj: T, converter: (text: string) => string): T {
  if (typeof obj === 'string') {
    return converter(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectStrings(item, converter)) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertObjectStrings(value, converter);
    }
    return converted as T;
  }

  return obj;
}

/**
 * 转换角色卡 JSON 数据
 * @param jsonData 角色卡 JSON 数据（对象或 JSON 字符串）
 * @param config 转换配置
 * @returns 转换后的 JSON 字符串
 */
function convertCharacterCardJson(jsonData: any | string, config: ConversionConfig): string {
  const cardData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  const converter = OpenCC.Converter({ from: 'cn', to: config });
  const convertedData = convertObjectStrings(cardData, converter);
  return JSON.stringify(convertedData);
}

/**
 * 转换单个 PNG 角色卡文件
 * @param file PNG 文件（File 对象）
 * @param config 转换配置
 * @returns 转换结果
 */
async function convertPngCharacterCard(file: File, config: ConversionConfig): Promise<ConversionResult> {
  try {
    // 读取文件为 Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);

    let jsonString: string;
    try {
      jsonString = read(imageData);
    } catch (error) {
      return {
        success: false,
        fileName: file.name,
        message: '无法读取角色卡元数据，可能不是有效的角色卡 PNG 文件',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    if (!jsonString) {
      return {
        success: false,
        fileName: file.name,
        message: 'PNG 文件中未找到角色卡数据',
      };
    }

    // 转换 JSON 数据
    let convertedJsonString: string;
    try {
      convertedJsonString = convertCharacterCardJson(jsonString, config);
    } catch (error) {
      return {
        success: false,
        fileName: file.name,
        message: '转换过程中发生错误',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    // 将转换后的 JSON 写回 PNG
    let convertedImageData: Uint8Array;
    try {
      convertedImageData = write(imageData, convertedJsonString);
    } catch (error) {
      return {
        success: false,
        fileName: file.name,
        message: '写入转换后的数据时发生错误',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    return {
      success: true,
      fileName: file.name,
      message: '转换成功',
      convertedData: convertedImageData,
    };
  } catch (error) {
    return {
      success: false,
      fileName: file.name,
      message: '处理文件时发生未知错误',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * 批量转换多个 PNG 角色卡文件
 * @param files PNG 文件数组
 * @param config 转换配置
 * @param onProgress 进度回调函数（可选）
 * @returns 所有文件的转换结果
 */
export async function convertPngCharacterCardBatch(
  files: File[],
  config: ConversionConfig,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // 触发进度回调
    if (onProgress) {
      onProgress(i, files.length, file.name);
    }

    // 转换单个文件
    const result = await convertPngCharacterCard(file, config);
    results.push(result);
  }

  // 最后一次进度更新（完成）
  if (onProgress && files.length > 0) {
    onProgress(files.length, files.length, '全部完成');
  }

  return results;
}

/**
 * 下载转换结果为 PNG 文件
 * @param result 转换结果
 * @param originalFileName 原始文件名
 */
async function downloadConvertedPng(result: ConversionResult, originalFileName?: string): Promise<void> {
  if (!result.success || !result.convertedData) {
    throw new Error('转换未成功或数据不可用');
  }

  // 生成下载文件名（添加后缀以区分）
  const fileName = originalFileName || result.fileName;
  const baseName = fileName.replace(/\.png$/i, '');
  const newFileName = `${baseName}_converted.png`;

  await saveFile({
    data: result.convertedData.slice(),
    fileName: newFileName,
    mimeType: 'image/png',
  });
}

/**
 * 批量下载所有转换成功的文件
 * @param results 转换结果数组
 * @param delay 每个下载之间的延迟（毫秒），避免浏览器阻止
 */
export async function downloadConvertedPngBatch(results: ConversionResult[], delay: number = 300): Promise<void> {
  const successResults = results.filter((r) => r.success && r.convertedData);

  for (let i = 0; i < successResults.length; i++) {
    const result = successResults[i];
    await downloadConvertedPng(result, result.fileName);

    // 延迟以避免浏览器阻止多个下载
    if (i < successResults.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
