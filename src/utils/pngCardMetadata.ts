import extract, { type Chunk } from 'png-chunks-extract';
import PNGtext from 'png-chunk-text';

// Helper for base64 encoding and decoding in browser environment
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function fromBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32Png(chunkType: Uint8Array, chunkData: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < chunkType.length; i++) {
    crc = CRC_TABLE[(crc ^ chunkType[i]) & 0xff] ^ (crc >>> 8);
  }

  for (let i = 0; i < chunkData.length; i++) {
    crc = CRC_TABLE[(crc ^ chunkData[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Encodes PNG chunks into a PNG file format buffer.
 * @param chunks Array of PNG chunks
 * @returns Encoded PNG data
 * @copyright Based on https://github.com/hughsk/png-chunks-encode (MIT)
 */
function encode(chunks: Chunk[]): Uint8Array {
  const uint8 = new Uint8Array(4);
  const int32 = new Int32Array(uint8.buffer);
  const uint32 = new Uint32Array(uint8.buffer);

  let totalSize = 8;
  let idx = totalSize;

  for (let i = 0; i < chunks.length; i++) {
    totalSize += chunks[i].data.length;
    totalSize += 12;
  }

  const output = new Uint8Array(totalSize);

  output[0] = 0x89;
  output[1] = 0x50;
  output[2] = 0x4e;
  output[3] = 0x47;
  output[4] = 0x0d;
  output[5] = 0x0a;
  output[6] = 0x1a;
  output[7] = 0x0a;

  for (let i = 0; i < chunks.length; i++) {
    const { name, data } = chunks[i];
    const size = data.length;
    const nameChars = [name.charCodeAt(0), name.charCodeAt(1), name.charCodeAt(2), name.charCodeAt(3)];

    uint32[0] = size;
    output[idx++] = uint8[3];
    output[idx++] = uint8[2];
    output[idx++] = uint8[1];
    output[idx++] = uint8[0];

    output[idx++] = nameChars[0];
    output[idx++] = nameChars[1];
    output[idx++] = nameChars[2];
    output[idx++] = nameChars[3];

    for (let j = 0; j < size; ) {
      output[idx++] = data[j++];
    }
    const crc = crc32Png(new Uint8Array(nameChars), data);

    int32[0] = crc;
    output[idx++] = uint8[3];
    output[idx++] = uint8[2];
    output[idx++] = uint8[1];
    output[idx++] = uint8[0];
  }

  return output;
}

/**
 * Writes Character metadata to a PNG image buffer.
 * @param image PNG image buffer as Uint8Array
 * @param data Character data to write (JSON string)
 * @returns PNG image buffer with metadata as Uint8Array
 */
export const write = (image: Uint8Array, data: string): Uint8Array => {
  const chunks = extract(image);
  const tEXtChunks = chunks.filter((chunk) => chunk.name === 'tEXt');

  // Remove existing tEXt chunks for chara data
  for (const tEXtChunk of tEXtChunks) {
    const decoded = PNGtext.decode(tEXtChunk.data);
    if (decoded.keyword.toLowerCase() === 'chara' || decoded.keyword.toLowerCase() === 'ccv3') {
      const index = chunks.indexOf(tEXtChunk);
      if (index > -1) {
        chunks.splice(index, 1);
      }
    }
  }

  // Add new v2 chunk before the IEND chunk
  const base64EncodedDataV2 = toBase64(data);
  chunks.splice(-1, 0, PNGtext.encode('chara', base64EncodedDataV2));

  // Try adding v3 chunk before the IEND chunk
  try {
    const v3Data = JSON.parse(data);
    v3Data.spec = 'chara_card_v3';
    v3Data.spec_version = '3.0';

    const base64EncodedDataV3 = toBase64(JSON.stringify(v3Data));
    chunks.splice(-1, 0, PNGtext.encode('ccv3', base64EncodedDataV3));
  } catch (error) {
    console.warn('Failed to create and add V3 character card chunk.', error);
  }

  return encode(chunks);
};

/**
 * Removes character card metadata chunks from a PNG image buffer.
 * Only strips app-specific `chara` and `ccv3` tEXt chunks and leaves other PNG data intact.
 * @param image PNG image buffer as Uint8Array
 * @returns PNG image buffer without character card metadata
 */
export const stripCharacterCardMetadata = (image: Uint8Array): Uint8Array => {
  const chunks = extract(image);
  let removedCount = 0;
  const sanitizedChunks = chunks.filter((chunk) => {
    if (chunk.name !== 'tEXt') {
      return true;
    }

    try {
      const decoded = PNGtext.decode(chunk.data);
      const keyword = decoded.keyword.toLowerCase();
      const shouldKeep = keyword !== 'chara' && keyword !== 'ccv3';
      if (!shouldKeep) {
        removedCount += 1;
      }
      return shouldKeep;
    } catch (error) {
      console.warn('Failed to decode PNG tEXt chunk while stripping metadata, keeping original chunk.', error);
      return true;
    }
  });

  if (removedCount === 0) {
    return image;
  }

  return encode(sanitizedChunks);
};

/**
 * Reads Character metadata from a PNG image buffer.
 * Supports both V2 (chara) and V3 (ccv3). V3 takes precedence.
 * @param image PNG image buffer as Uint8Array
 * @returns Character data as a string
 */
export const read = (image: Uint8Array): string => {
  const chunks = extract(image);

  const textChunks = chunks.filter((chunk) => chunk.name === 'tEXt').map((chunk) => PNGtext.decode(chunk.data));

  if (textChunks.length === 0) {
    console.error('PNG metadata does not contain any text chunks.');
    throw new Error('No PNG metadata found.');
  }

  const ccv3Chunk = textChunks.find((chunk) => chunk.keyword.toLowerCase() === 'ccv3');
  if (ccv3Chunk) {
    return fromBase64(ccv3Chunk.text);
  }

  const charaChunk = textChunks.find((chunk) => chunk.keyword.toLowerCase() === 'chara');
  if (charaChunk) {
    return fromBase64(charaChunk.text);
  }

  console.error('PNG metadata does not contain any character data.');
  throw new Error('No character data found in PNG metadata.');
};
