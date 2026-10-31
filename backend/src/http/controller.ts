import type { RequestHandler } from 'express';
import { z } from 'zod';
import { teacherId } from './context';

/** Valida antes de chamar o service; somente respostas de sucesso carregam o DTO. */
export function controller<S extends z.ZodType>(
  schema: S,
  action: (input: z.output<S>, teacherId: string) => unknown | Promise<unknown>,
  status = 200,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const input = schema.parse({ params: req.params, query: req.query, body: req.body });
      const result = await action(input, teacherId(res));
      if (status === 204) res.status(204).end();
      else res.status(status).json(result);
    } catch (error) {
      next(error);
    }
  };
}
