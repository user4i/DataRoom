import { createHash } from 'crypto';

export async function extractPdfText(buffer: Buffer) {
  const { extractText } = await import('unpdf');
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  const joined = Array.isArray(text) ? text.join('\n') : String(text ?? '');
  return joined.replace(/\u0000/g, '').trim();
}

export function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
