import { Request, Response, NextFunction } from 'express';
import { localeFromHeader, runWithLocale } from './locale';

export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  runWithLocale(localeFromHeader(req.headers['accept-language']), () => next());
}
