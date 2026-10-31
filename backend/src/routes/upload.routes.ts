import { Router } from 'express';
import * as uploads from '../controllers/upload.controller';

export const uploadRouter = Router();
uploadRouter.post('/batch', uploads.createBatch);
uploadRouter.post('/batch/:id/sheets', uploads.recordSheets);
