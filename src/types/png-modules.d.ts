declare module 'png-chunks-extract' {
  export interface Chunk {
    name: string;
    data: Uint8Array;
  }
  export default function extract(data: Uint8Array): Chunk[];
}

declare module 'png-chunk-text' {
  export interface tEXtChunk {
    keyword: string;
    text: string;
  }
  function encode(keyword: string, content: string): { name: string; data: Uint8Array };
  function decode(data: Uint8Array): tEXtChunk;

  const PNGtext: {
    encode: typeof encode;
    decode: typeof decode;
  };

  export default PNGtext;
}
