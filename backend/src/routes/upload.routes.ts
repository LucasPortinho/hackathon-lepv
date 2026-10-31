import express, { Router } from 'express';
import * as uploads from '../controllers/upload.controller';

export const uploadRouter = Router();
uploadRouter.post('/batch', uploads.createBatch);
uploadRouter.put('/batch/:id/files/:fileId/content', express.raw({ type: () => true, limit: '25mb' }), uploads.storeFile);
uploadRouter.post('/batch/:id/sheets', uploads.recordSheets);
uploadRouter.post('/batch/:id/process', uploads.process);
