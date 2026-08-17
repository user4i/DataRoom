import { BadRequestException, Injectable } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { t } from '../i18n/t';

@Injectable()
export class LlmService {
  async complete(params: {
    provider: AiProvider;
    apiKey: string;
    baseUrl?: string | null;
    model?: string | null;
    prompt: string;
  }) {
    if (params.provider === 'GEMINI') {
      return this.gemini(params.apiKey, params.model, params.prompt);
    }
    if (!params.baseUrl?.trim()) {
      throw new BadRequestException(t('aiBaseUrlRequired'));
    }
    return this.openaiCompat(params.baseUrl.trim(), params.apiKey, params.model, params.prompt);
  }

  private async gemini(apiKey: string, model: string | null | undefined, prompt: string) {
    const name = (model || 'gemini-2.0-flash').replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!res.ok) {
      throw new Error(body.error?.message || `Gemini HTTP ${res.status}`);
    }
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) throw new Error('Empty Gemini response');
    return text;
  }

  private async openaiCompat(baseUrl: string, apiKey: string, model: string | null | undefined, prompt: string) {
    const root = baseUrl.replace(/\/+$/, '');
    const url = root.endsWith('/chat/completions') ? root : `${root}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a produce-trade analyst. Answer with a single JSON object only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!res.ok) {
      throw new Error(body.error?.message || `LLM HTTP ${res.status}`);
    }
    const text = body.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty LLM response');
    return text;
  }
}
