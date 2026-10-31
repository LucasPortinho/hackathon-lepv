import { createApp } from './app';
import { DEMO_TEACHER_ID } from './db/seed/data/catalog';
import { ensureDemoDatabase } from './db/seed';

const PORT = Number(process.env.PORT ?? 3333);

async function main() {
  if (await ensureDemoDatabase()) console.log('Banco da demonstração criado.');
  createApp({ teacherId: DEMO_TEACHER_ID }).listen(PORT, () => console.log(`API em http://localhost:${PORT}/api/v1`));
}

main();
