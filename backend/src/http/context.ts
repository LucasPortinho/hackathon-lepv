import type { RequestHandler, Response } from 'express';

/** Contexto fixo da demo, escolhido no backend, sem login ou identidade enviada pelo cliente. */
export function demoTeacherContext(id: string): RequestHandler {
  if (typeof id !== 'string' || !id.trim() || id.length > 200) {
    throw new Error('Configure um teacherId válido para a demonstração.');
  }
  return (_req, res, next) => {
    res.locals.teacherId = id;
    res.setHeader('Cache-Control', 'no-store');
    next();
  };
}

export function teacherId(res: Response): string {
  if (typeof res.locals.teacherId !== 'string') throw new Error('Contexto do professor não configurado.');
  return res.locals.teacherId;
}
