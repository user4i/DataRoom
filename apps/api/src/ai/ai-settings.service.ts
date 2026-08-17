import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret, last4 } from './crypto';
import { PatchAiSettingsDto } from './dto/ai-settings.dto';

const DEFAULTS = {
  locale: 'en' as const,
  provider: 'OPENAI_COMPATIBLE' as AiProvider,
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
    if (!row) return { ...DEFAULTS };
    return {
      locale: row.locale === 'uk' ? 'uk' : 'en',
      provider: row.provider,
      baseUrl: row.baseUrl,
      model: row.model,
      hasKey: Boolean(row.apiKeyCipher),
      apiKeyLast4: row.apiKeyLast4,
    };
  }

  async upsert(userId: string, dto: PatchAiSettingsDto) {
    const current = await this.prisma.userAiSettings.findUnique({ where: { userId } });
    const locale = dto.locale ?? current?.locale ?? 'en';
    const provider = dto.provider ?? current?.provider ?? 'OPENAI_COMPATIBLE';
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
    if (!row?.apiKeyCipher) return null;
    return decryptSecret(row.apiKeyCipher, this.secret());
  }
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
