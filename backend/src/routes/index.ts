import { Router } from 'express';
import { demoTeacherContext } from '../http/context';
import { activityRouter } from './activity.routes';
import { catalogRouter } from './catalog.routes';
import { classRouter } from './class.routes';
import { dashboardRouter } from './dashboard.routes';
import { diagnosticRouter } from './diagnostic.routes';
import { examRouter } from './exam.routes';
import { studentRouter } from './student.routes';
import { teacherRouter } from './teacher.routes';
import { uploadRouter } from './upload.routes';

/** Monte em /api/v1. teacherId é configuração da demo, nunca um parâmetro HTTP. */
export function createApiRouter(options: { teacherId: string }) {
  const router = Router();
  router.use(demoTeacherContext(options.teacherId));
  router.use('/teachers', teacherRouter);
  router.use(catalogRouter);
  router.use('/classes', classRouter);
  router.use('/students', studentRouter);
  router.use('/dashboard', dashboardRouter);
  router.use('/exams', examRouter);
  router.use('/diagnostics', diagnosticRouter);
  router.use('/uploads', uploadRouter);
  router.use(activityRouter);
  return router;
}
