//! WebDAV resource URL construction without transport concerns.

const CACHE_BUSTER_KEY = "_st_cardplus_cache";

/**
 * Resolves a WebDAV resource path and optionally makes the URL unique for a read.
 *
 * `cacheNonce` must only be supplied for safe requests such as GET. Mutating
 * requests must use the stable resource URL so caches can invalidate it.
 */
export function buildWebDAVResourceUrl(
  baseUrl: string,
  remotePath: string,
  cacheNonce?: number,
): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(remotePath, normalizedBase);

  if (cacheNonce !== undefined) {
    url.searchParams.set(CACHE_BUSTER_KEY, String(cacheNonce));
  }

  return url.toString();
}
