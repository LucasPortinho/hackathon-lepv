import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './http/errors';
import { createApiRouter } from './routes';

/** A fábrica não abre porta. O professor da demo é definido pelo backend. */
export function createApp(options: { teacherId: string; corsOrigin?: string }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use(cors({ origin: options.corsOrigin ?? 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1', createApiRouter({ teacherId: options.teacherId }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
