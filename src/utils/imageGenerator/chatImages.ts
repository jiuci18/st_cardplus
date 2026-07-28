//! OpenAI-compatible Chat Completions image generation and response parsing.

import { modelsEndpoint } from './chatEndpoint'

/** Browser-local credentials and routing for an image-capable Chat API. */
export interface ChatImageConfig {
  endpoint: string
  apiKey: string
  model: string
  stream: boolean
}

/** A generated image that is either owned browser data or a remote resource. */
export type GeneratedImage =
  | { kind: 'blob'; blob: Blob; mimeType: string }
  | { kind: 'remote'; url: string }

/** A typed failure suitable for display in the image generator UI. */
export class ChatImageError extends Error {
  constructor(
    message: string,
    public readonly code: 'config' | 'network' | 'upstream' | 'response',
  ) {
    super(message)
  }
}

/** Optional dependencies and multimodal input for one generation request. */
export interface GenerateChatImageOptions {
  referenceImages?: string[]
  fetcher?: typeof fetch
  /** Aborts the request, including an in-flight streaming response. */
  signal?: AbortSignal
  /** Reports cumulative received bytes while a streaming response arrives. */
  onProgress?: (receivedBytes: number) => void
}

/** Milliseconds without new stream data before the request is abandoned. */
const streamIdleTimeoutMs = 60_000

const systemPrompt = [
  'Generate exactly one image from the user description.',
  'Use the attached reference image as visual guidance when present.',
  'Return the image as a data:image/*;base64 URL, raw base64 image data,',
  'a Markdown image, or a directly accessible HTTPS image URL.',
  'Do not include unrelated text.',
].join(' ')

/** Calls an OpenAI-compatible Chat Completions endpoint and extracts its first image. */
export async function generateChatImage(
  config: ChatImageConfig,
  prompt: string,
  options: GenerateChatImageOptions = {},
): Promise<GeneratedImage> {
  const endpoint = validateEndpoint(config.endpoint)
  const model = config.model.trim()
  const input = prompt.trim()
  if (!model) throw new ChatImageError('请填写模型名称', 'config')
  if (!input) throw new ChatImageError('请输入图片提示词', 'config')

  const headers = new Headers({ 'Content-Type': 'application/json' })
  const apiKey = config.apiKey.trim()
  if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`)

  let response: Response
  try {
    response = await (options.fetcher ?? fetch)(endpoint, {
      method: 'POST',
      headers,
      signal: options.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: options.referenceImages?.length
              ? [
                  { type: 'text', text: input },
                  ...options.referenceImages.map((url) => ({
                    type: 'image_url',
                    image_url: { url },
                  })),
                ]
              : input,
          },
        ],
        stream: config.stream === true,
      }),
    })
  } catch {
    if (options.signal?.aborted) throw new ChatImageError('生成已取消', 'network')
    throw new ChatImageError('无法连接 ChatAPI，请检查地址和浏览器 CORS 设置', 'network')
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ChatImageError(upstreamMessage(payload, response.status), 'upstream')
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (config.stream === true && contentType.includes('text/event-stream') && response.body) {
    return parseChatImageStream(response.body, options)
  }

  const payload: unknown = await response.json().catch(() => null)
  return parseChatImageResponse(payload)
}

/** Lists the model IDs advertised by an OpenAI-compatible endpoint. */
export async function fetchChatModels(
  config: Pick<ChatImageConfig, 'endpoint' | 'apiKey'>,
  options: { fetcher?: typeof fetch; signal?: AbortSignal } = {},
): Promise<string[]> {
  const endpoint = modelsEndpoint(config.endpoint)
  if (!endpoint) throw new ChatImageError('ChatAPI 地址无效', 'config')

  const headers = new Headers()
  const apiKey = config.apiKey.trim()
  if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`)

  let response: Response
  try {
    response = await (options.fetcher ?? fetch)(endpoint, { headers, signal: options.signal })
  } catch {
    if (options.signal?.aborted) throw new ChatImageError('已取消获取模型列表', 'network')
    throw new ChatImageError(
      '无法读取模型列表，请检查地址和浏览器 CORS 设置',
      'network',
    )
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ChatImageError(upstreamMessage(payload, response.status), 'upstream')
  }

  const models = parseChatModels(await response.json().catch(() => null))
  if (!models.length) throw new ChatImageError('上游没有返回任何模型', 'response')
  return models
}

/** Extracts sorted, unique model IDs from a model listing response. */
export function parseChatModels(payload: unknown): string[] {
  const entries = modelEntries(payload)
  const models = new Set<string>()
  for (const entry of entries) {
    if (typeof entry === 'string') {
      if (entry.trim()) models.add(entry.trim())
      continue
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
    const values = entry as Record<string, unknown>
    const id = values.id ?? values.model ?? values.name
    if (typeof id === 'string' && id.trim()) models.add(id.trim())
  }
  return [...models].sort((left, right) => left.localeCompare(right))
}

function modelEntries(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (typeof payload !== 'object' || payload === null) return []
  const fields = payload as Record<string, unknown>
  for (const key of ['data', 'models', 'items']) {
    if (Array.isArray(fields[key])) return fields[key]
  }
  return []
}

/** Consumes a Chat Completions SSE stream and extracts its first image. */
async function parseChatImageStream(
  body: ReadableStream<Uint8Array>,
  options: GenerateChatImageOptions,
): Promise<GeneratedImage> {
  const text: string[] = []
  const parts: unknown[] = []

  const consume = (line: string) => {
    if (!line.startsWith('data:')) return
    const data = line.slice('data:'.length).trim()
    if (!data || data === '[DONE]') return
    let event: unknown
    try {
      event = JSON.parse(data)
    } catch {
      return
    }
    if (typeof event !== 'object' || event === null || Array.isArray(event)) return
    const fields = event as Record<string, unknown>
    if (fields.error !== undefined) {
      const errorMessage =
        typeof fields.error === 'object' && fields.error !== null && !Array.isArray(fields.error)
          ? (fields.error as Record<string, unknown>).message
          : undefined
      throw new ChatImageError(
        typeof errorMessage === 'string' && errorMessage.trim()
          ? errorMessage
          : 'ChatAPI 流式响应返回错误',
        'upstream',
      )
    }
    const choices = fields.choices
    if (!Array.isArray(choices)) return
    for (const choice of choices) {
      if (typeof choice !== 'object' || choice === null || Array.isArray(choice)) continue
      const values = choice as Record<string, unknown>
      const delta = values.delta ?? values.message
      if (typeof delta !== 'object' || delta === null || Array.isArray(delta)) continue
      const content = (delta as Record<string, unknown>).content
      if (typeof content === 'string') text.push(content)
      else if (Array.isArray(content)) parts.push(...content)
      const images = (delta as Record<string, unknown>).images
      if (Array.isArray(images)) parts.push(...images)
    }
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let received = 0
  try {
    for (;;) {
      let idleTimer: number | undefined
      const { done, value } = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          idleTimer = window.setTimeout(
            () => reject(new ChatImageError(
              `流式响应超时（${streamIdleTimeoutMs / 1000} 秒无数据），请重试或关闭流式请求`,
              'network',
            )),
            streamIdleTimeoutMs,
          )
        }),
      ]).finally(() => window.clearTimeout(idleTimer))
      if (value) {
        received += value.byteLength
        options.onProgress?.(received)
        buffer += decoder.decode(value, { stream: true })
        let newline: number
        while ((newline = buffer.indexOf('\n')) >= 0) {
          consume(buffer.slice(0, newline).replace(/\r$/, ''))
          buffer = buffer.slice(newline + 1)
        }
      }
      if (done) break
    }
  } catch (error) {
    void reader.cancel().catch(() => {})
    if (options.signal?.aborted) throw new ChatImageError('生成已取消', 'network')
    if (error instanceof ChatImageError) throw error
    throw new ChatImageError('流式响应中断，请重试或关闭流式请求', 'network')
  }
  buffer += decoder.decode()
  for (const line of buffer.split('\n')) consume(line.replace(/\r$/, ''))

  return parseChatImageResponse({
    choices: [{ message: { content: [text.join(''), ...parts] } }],
  })
}

/** Extracts the first supported image from a Chat Completions response. */
export function parseChatImageResponse(payload: unknown): GeneratedImage {
  const choices =
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).choices
      : undefined
  if (!Array.isArray(choices)) {
    throw new ChatImageError('ChatAPI 响应缺少 choices', 'response')
  }

  const contents: unknown[] = []
  for (const choice of choices) {
    if (typeof choice !== 'object' || choice === null || Array.isArray(choice)) continue
    const message = (choice as Record<string, unknown>).message
    if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
      contents.push((message as Record<string, unknown>).content)
    }
  }

  for (const content of contents) {
    for (const candidate of contentCandidates(content)) {
      const parsed = parseImageCandidate(candidate)
      if (parsed) return parsed
    }
  }

  const text = contents
    .flatMap(contentCandidates)
    .find((candidate) => candidate.trim().length > 0)
  const normalized = text?.replace(/\s+/g, ' ').trim() ?? ''
  const suffix = normalized
    ? `：${normalized.length <= 160 ? normalized : `${normalized.slice(0, 160)}…`}`
    : ''
  throw new ChatImageError(`模型回复中未识别到图片${suffix}`, 'response')
}

/** Downloads a remote result and verifies it is an accepted image. */
export async function downloadRemoteImage(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<{ blob: Blob; mimeType: string }> {
  let response: Response
  try {
    response = await fetcher(url)
  } catch {
    throw new ChatImageError('浏览器无法下载该图片，可能被上游 CORS 策略阻止', 'network')
  }
  if (!response.ok) {
    throw new ChatImageError(`图片下载失败（HTTP ${response.status}）`, 'upstream')
  }
  const blob = await response.blob()
  if (blob.size > 10 << 20) {
    throw new ChatImageError('生成图片超过图片库 10 MB 上传限制', 'response')
  }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const mimeType = detectImageMIME(bytes)
  if (!mimeType) throw new ChatImageError('远程内容不是受支持的图片', 'response')
  return { blob: new Blob([bytes], { type: mimeType }), mimeType }
}

/** Returns a stable upload name for a generated image. */
export function generatedFileName(mimeType: string, now = new Date()): string {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length)
  return `generated-${now.toISOString().replace(/[:.]/g, '-')}.${extension}`
}

function validateEndpoint(raw: string): string {
  const value = raw.trim()
  let endpoint: URL
  try {
    endpoint = new URL(value)
  } catch {
    throw new ChatImageError('ChatAPI 地址无效', 'config')
  }
  if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
    throw new ChatImageError('ChatAPI 地址必须使用 HTTP 或 HTTPS', 'config')
  }
  return endpoint.toString()
}

function upstreamMessage(payload: unknown, status: number): string {
  const error =
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).error
      : undefined
  const message =
    typeof error === 'object' && error !== null && !Array.isArray(error)
      ? (error as Record<string, unknown>).message
      : undefined
  if (typeof message === 'string' && message.trim()) return message
  if (status === 401 || status === 403) return 'ChatAPI 鉴权失败，请检查 API Key'
  if (status === 429) return 'ChatAPI 请求过于频繁或额度不足'
  return `ChatAPI 请求失败（HTTP ${status}）`
}

function contentCandidates(content: unknown): string[] {
  if (typeof content === 'string') return [content]
  if (!Array.isArray(content)) return []

  const candidates: string[] = []
  for (const part of content) {
    if (typeof part === 'string') {
      candidates.push(part)
      continue
    }
    if (typeof part !== 'object' || part === null || Array.isArray(part)) continue
    const values = part as Record<string, unknown>
    const text = values.text
    if (typeof text === 'string') candidates.push(text)

    const imageURL = values.image_url
    if (typeof imageURL === 'string') candidates.push(imageURL)
    const nestedURL =
      typeof imageURL === 'object' && imageURL !== null && !Array.isArray(imageURL)
        ? (imageURL as Record<string, unknown>).url
        : undefined
    if (typeof nestedURL === 'string') candidates.push(nestedURL)

    const url = values.url
    const type = values.type
    if (typeof url === 'string' && typeof type === 'string' && type.includes('image')) {
      candidates.push(url)
    }
  }
  return candidates
}

function parseImageCandidate(raw: string): GeneratedImage | null {
  const candidate = raw.trim()
  const dataURL = candidate.match(/data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)/i)
  if (dataURL) return decodeBase64Image(dataURL[2], dataURL[1].toLowerCase())

  const markdownURL = candidate.match(/!\[[^\]]*]\(\s*(https?:\/\/[^\s)]+)\s*(?:["'][^)]*)?\)/i)
  if (markdownURL) return { kind: 'remote', url: markdownURL[1] }

  const remoteURL = candidate.match(/https?:\/\/[^\s<>"')\]]+/i)
  if (remoteURL) return { kind: 'remote', url: remoteURL[0] }

  const unfenced = candidate
    .replace(/^```(?:base64)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\s+/g, '')
  if (unfenced.length >= 16 && /^[A-Za-z0-9+/]+={0,2}$/.test(unfenced)) {
    return decodeBase64Image(unfenced)
  }
  return null
}

function decodeBase64Image(encoded: string, declaredMIME?: string): GeneratedImage | null {
  const compact = encoded.replace(/\s+/g, '')
  const padded = compact.padEnd(compact.length + ((4 - (compact.length % 4)) % 4), '=')
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return null
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const detectedMIME = detectImageMIME(bytes)
  if (!detectedMIME || (declaredMIME && declaredMIME !== detectedMIME)) return null
  return {
    kind: 'blob',
    blob: new Blob([bytes], { type: detectedMIME }),
    mimeType: detectedMIME,
  }
}

function detectImageMIME(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) return 'image/webp'
  if (
    bytes.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.slice(0, 6)))
  ) {
    return 'image/gif'
  }
  return null
}
