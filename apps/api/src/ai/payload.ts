export type FindingTone = 'green' | 'yellow' | 'red' | 'alert';

export type AiPayload = {
  summary: string;
  findings: { tone: FindingTone; text: string }[];
  table?: {
    columns: string[];
    rows: { cells: string[]; tone?: FindingTone }[];
  };
};

const TONES: FindingTone[] = ['green', 'yellow', 'red', 'alert'];

export function parseAiPayload(raw: string): AiPayload {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/u, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI response was not JSON');
  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<AiPayload>;
  const findings = Array.isArray(parsed.findings)
    ? parsed.findings
        .map((item) => ({
          tone: TONES.includes(item?.tone as FindingTone) ? (item.tone as FindingTone) : 'yellow',
          text: String(item?.text ?? '').trim(),
        }))
        .filter((item) => item.text)
    : [];
  const table =
    parsed.table && Array.isArray(parsed.table.columns) && Array.isArray(parsed.table.rows)
      ? {
          columns: parsed.table.columns.map((c) => String(c)),
          rows: parsed.table.rows.map((row) => ({
            cells: (row.cells ?? []).map((c) => String(c)),
            tone: TONES.includes(row.tone as FindingTone) ? (row.tone as FindingTone) : undefined,
          })),
        }
      : undefined;
  return {
    summary: String(parsed.summary ?? '').trim() || 'No summary.',
    findings,
    table,
  };
}
