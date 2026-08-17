import { escapeHtml } from './pdf-text';
import type { AiPayload, FindingTone } from './payload';

export function payloadToHtml(payload: AiPayload) {
  const parts: string[] = [`<div class="ai-report">`];
  parts.push(`<p class="ai-summary">${escapeHtml(payload.summary)}</p>`);
  if (payload.findings.length) {
    parts.push('<div class="ai-findings">');
    for (const finding of payload.findings) {
      parts.push(`<p class="ai-line ai-${finding.tone}">${escapeHtml(finding.text)}</p>`);
    }
    parts.push('</div>');
  }
  if (payload.table && payload.table.columns.length) {
    parts.push('<table class="ai-table"><thead><tr>');
    for (const col of payload.table.columns) {
      parts.push(`<th>${escapeHtml(col)}</th>`);
    }
    parts.push('</tr></thead><tbody>');
    for (const row of payload.table.rows) {
      const tone = row.tone ? ` ai-${row.tone}` : '';
      parts.push(`<tr class="ai-row${tone}">`);
      for (const cell of row.cells) {
        parts.push(`<td>${escapeHtml(cell)}</td>`);
      }
      parts.push('</tr>');
    }
    parts.push('</tbody></table>');
  }
  parts.push('</div>');
  return parts.join('');
}

export function toneLabel(tone: FindingTone) {
  return tone;
}
