export function fileSummaryPrompt(locale: 'en' | 'uk', fileName: string, text: string) {
  const language = locale === 'uk' ? 'Ukrainian' : 'English';
  return `You analyze fruit and vegetable order-proposal PDFs in a virtual data room.
Reply in ${language}. Return ONLY JSON:
{
  "summary": "short paragraph",
  "findings": [{ "tone": "green"|"yellow"|"red"|"alert", "text": "one finding" }]
}
Tones:
- green: fair price, disclosed agent, consistent arithmetic, interesting but healthy detail
- yellow: worth a second look (mixed origin, incomplete scan, unusual Incoterms)
- red: strange or unscrupulous (wrong total, cash/no VAT, fake letterhead, hidden markup)
- alert: reserved for extreme fraud signals on a single document (duplicate lot on the same sheet, claimed supplier does not match letterhead AND totals are wrong)

Extract if present: supplier, proposal date, line items (list price, quantity, sum), intermediary, payment terms.
File name: ${fileName}

Document text:
${text.slice(0, 24000)}`;
}

export function folderSummaryPrompt(locale: 'en' | 'uk', folderName: string, corpus: string) {
  const language = locale === 'uk' ? 'Ukrainian' : 'English';
  return `You summarize a folder of fruit/vegetable order proposals (files in the folder plus immediate subfolders only).
Reply in ${language}. Return ONLY JSON:
{
  "summary": "short paragraph about the folder",
  "findings": [{ "tone": "green"|"yellow"|"red"|"alert", "text": "one finding" }]
}
Tones: green = healthy/optimal, yellow = noteworthy, red = strange or dishonest, alert = very strange across the set.
Folder: ${folderName}

${corpus.slice(0, 28000)}`;
}

export function folderComparePrompt(locale: 'en' | 'uk', folderName: string, corpus: string) {
  const language = locale === 'uk' ? 'Ukrainian' : 'English';
  return `Compare fruit/vegetable order proposals inside this folder (direct files + one subfolder level).
Reply in ${language}. Return ONLY JSON:
{
  "summary": "comparison overview",
  "findings": [{ "tone": "green"|"yellow"|"red"|"alert", "text": "one finding" }],
  "table": {
    "columns": ["File", "Supplier", "Date", "Items", "Sum", "Notes"],
    "rows": [{ "cells": ["..."], "tone": "green"|"yellow"|"red"|"alert" }]
  }
}
Row tones: green competitive/fair, yellow odd, red dishonest, alert when comparison is very strange (same lot twice, copied list with a different total, broker hiding the grower).
Folder: ${folderName}

${corpus.slice(0, 28000)}`;
}
