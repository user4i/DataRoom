import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret, last4 } from './crypto';
import { PatchAiSettingsDto } from './dto/ai-settings.dto';

const GROQ_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const DEFAULTS = {
  locale: 'uk' as const,
  provider: 'GEMINI' as AiProvider,
  baseUrl: null as string | null,
  model: null as string | null,
  hasKey: false,
  apiKeyLast4: null as string | null,
};

@Injectable()
export class AiSettingsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  secret() {
    return this.config.get<string>('AI_KEY_SECRET') || this.config.get<string>('JWT_SECRET') || 'dev-secret';
  }

  async get(userId: string) {
    const row = await this.prisma.userAiSettings.findUnique({ where: { userId } });
    const provider = row?.provider ?? DEFAULTS.provider;
    const envKey = this.envKey(provider);
    const userHasKey = Boolean(row?.apiKeyCipher);
    return {
      locale: row?.locale === 'en' ? 'en' : 'uk',
      provider,
      baseUrl: row?.baseUrl ?? (provider === 'OPENAI_COMPATIBLE' ? GROQ_URL : null),
      model: row?.model ?? (provider === 'OPENAI_COMPATIBLE' ? GROQ_MODEL : null),
      hasKey: userHasKey || Boolean(envKey),
      apiKeyLast4: userHasKey ? row?.apiKeyLast4 ?? null : envKey ? last4(envKey) : null,
    };
  }

  async upsert(userId: string, dto: PatchAiSettingsDto) {
    const current = await this.prisma.userAiSettings.findUnique({ where: { userId } });
    const locale = dto.locale ?? current?.locale ?? DEFAULTS.locale;
    const provider = dto.provider ?? current?.provider ?? DEFAULTS.provider;
    const baseUrl = dto.baseUrl !== undefined ? emptyToNull(dto.baseUrl) : (current?.baseUrl ?? null);
    const model = dto.model !== undefined ? emptyToNull(dto.model) : (current?.model ?? null);
    let apiKeyCipher = current?.apiKeyCipher ?? null;
    let apiKeyLast4 = current?.apiKeyLast4 ?? null;
    if (dto.apiKey !== undefined && dto.apiKey.trim()) {
      apiKeyCipher = encryptSecret(dto.apiKey.trim(), this.secret());
      apiKeyLast4 = last4(dto.apiKey.trim());
    }
    await this.prisma.userAiSettings.upsert({
      where: { userId },
      create: { userId, locale, provider, baseUrl, model, apiKeyCipher, apiKeyLast4 },
      update: { locale, provider, baseUrl, model, apiKeyCipher, apiKeyLast4 },
    });
    return this.get(userId);
  }

  async decryptedKey(userId: string) {
    const row = await this.prisma.userAiSettings.findUnique({ where: { userId } });
    if (row?.apiKeyCipher) return decryptSecret(row.apiKeyCipher, this.secret());
    return this.envKey(row?.provider ?? DEFAULTS.provider);
  }

  private envKey(provider: AiProvider) {
    const name = provider === 'GEMINI' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY';
    return emptyToNull(this.config.get<string>(name) ?? '');
  }
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
