import { fetchBytesResource } from "@/utils/fetchResource";

export interface BinaryFetchResult {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}

export interface BinaryFetchOptions {
  cache?: RequestCache;
  expectImage?: boolean;
  preferDesktopBackend?: boolean;
}

const assertExpectedImage = (mimeType: string, url: string) => {
  if (
    mimeType &&
    mimeType !== "application/octet-stream" &&
    !mimeType.toLowerCase().startsWith("image/")
  ) {
    throw new Error(`链接返回的内容不是图片: ${url}`);
  }
};

const validateExpectedImage = (
  result: { mimeType: string; url: string },
  options: BinaryFetchOptions,
) => {
  if (options.expectImage) {
    assertExpectedImage(result.mimeType, result.url);
  }
};

const bytesToBlob = (bytes: Uint8Array, mimeType: string): Blob => {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  const arrayBuffer = copied.buffer.slice(
    copied.byteOffset,
    copied.byteOffset + copied.byteLength,
  );
  return new Blob([arrayBuffer], { type: mimeType });
};

/**
 * Downloads remote binary content and returns bytes plus inferred file metadata.
 */
export const fetchBinaryResource = async (
  url: string,
  options: BinaryFetchOptions = {},
): Promise<BinaryFetchResult> => {
  const result = await fetchBytesResource(url, options);
  validateExpectedImage(result, options);

  return {
    bytes: result.data,
    fileName: result.fileName,
    mimeType: result.mimeType,
  };
};

/**
 * Converts downloaded bytes into a Blob.
 */
export const binaryFetchResultToBlob = (result: BinaryFetchResult): Blob =>
  bytesToBlob(result.bytes, result.mimeType);

/**
 * Downloads an image resource as Blob.
 */
export const fetchImageBlob = async (
  url: string,
  options: Omit<BinaryFetchOptions, "expectImage"> = {},
): Promise<Blob> => {
  const result = await fetchBinaryResource(url, {
    ...options,
    expectImage: true,
  });
  return binaryFetchResultToBlob(result);
};
