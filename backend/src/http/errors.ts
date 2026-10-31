import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../services/shared/errors';

export const notFound: RequestHandler = (_req, _res, next) => next(new NotFoundError('Rota não encontrada.'));

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: {
      code: 'VALIDATION_ERROR', message: 'Requisição inválida.',
      details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    } });
    return;
  }
  const domain = error instanceof UnauthorizedError ? [401, 'UNAUTHORIZED'] as const
    : error instanceof NotFoundError ? [404, 'NOT_FOUND'] as const
    : error instanceof ValidationError ? [400, 'VALIDATION_ERROR'] as const
    : error instanceof ConflictError ? [409, 'CONFLICT'] as const
    : undefined;
  if (domain) {
    if (domain[0] === 401) res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(domain[0]).json({ error: { code: domain[1], message: (error as Error).message } });
    return;
  }
  const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: {
      code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_REQUEST',
      message: status === 413 ? 'O corpo da requisição excede o limite permitido.' : 'Corpo da requisição inválido.',
    } });
    return;
  }
  console.error('Erro ao atender requisição:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a requisição.' } });
};
