//! Pure URL shaping for OpenAI-compatible endpoints entered by hand.

const completionsSuffix = '/chat/completions'

/** Expands a partially typed base URL into a Chat Completions endpoint. */
export function completionsEndpoint(raw: string): string {
  const url = parseEndpoint(raw)
  if (!url) return raw.trim()
  url.pathname = completionsPath(trimSlashes(url.pathname))
  return url.toString()
}

/** Derives the model listing endpoint that pairs with a Chat Completions URL. */
export function modelsEndpoint(raw: string): string {
  const url = parseEndpoint(raw)
  if (!url) return ''
  const path = completionsPath(trimSlashes(url.pathname))
  url.pathname = `${path.slice(0, -completionsSuffix.length)}/models`
  url.search = ''
  url.hash = ''
  return url.toString()
}

/** Suggests the completed endpoint while the address is still being typed. */
export function endpointSuggestions(raw: string): string[] {
  const value = raw.trim()
  if (!value) return []
  const completed = completionsEndpoint(value)
  return completed === value ? [] : [completed]
}

/** Parses a hand-typed address, assuming HTTPS when no scheme is present. */
function parseEndpoint(raw: string): URL | null {
  const value = raw.trim()
  if (!value) return null
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) return null
  return url
}

/**
 * Completes a path into a Chat Completions path, treating any trailing
 * version segment as the API root and anything else as a proxy prefix.
 */
function completionsPath(path: string): string {
  if (path.endsWith(completionsSuffix)) return path
  if (path.endsWith('/chat')) return `${path}/completions`
  const segments = path.split('/')
  if (/^v\d+[a-z\d_-]*$/i.test(segments[segments.length - 1] ?? '')) {
    return `${path}${completionsSuffix}`
  }
  return `${path}/v1${completionsSuffix}`
}

function trimSlashes(path: string): string {
  return path.replace(/\/+$/, '')
}
