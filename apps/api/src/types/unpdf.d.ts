declare module 'unpdf' {
  export function extractText(
    data: Uint8Array,
    options?: { mergePages?: boolean },
  ): Promise<{ text: string | string[] }>;
}
