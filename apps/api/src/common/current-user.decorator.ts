import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { t } from '../i18n/t';

export type RequestUser = {
  id: string;
  email: string;
  name: string;
};

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!request.user) {
      throw new UnauthorizedException(t('authRequired'));
    }
    return request.user;
  },
);

export const OptionalUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser | null => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    return request.user ?? null;
  },
);
