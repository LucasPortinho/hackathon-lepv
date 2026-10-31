import { createApp } from './app';
import { DEMO_TEACHER_ID } from './db/seed/data/catalog';
import { DEFAULT_SUBJECT_ID, ensureDemoDatabase } from './db/seed';
import { agentsEnabled } from './lib/llm';
import { enrichRuleProfiles } from './services/profiles/profile.service';

const PORT = Number(process.env.PORT ?? 3333);

async function main() {
  if (await ensureDemoDatabase()) console.log('Banco da demonstração criado.');
  createApp({ teacherId: DEMO_TEACHER_ID }).listen(PORT, () => console.log(`API em http://localhost:${PORT}/api/v1`));
  console.log(agentsEnabled() ? 'Agentes de IA ativos.' : 'Agentes de IA desligados: usando as regras locais.');
  enrichRuleProfiles(DEMO_TEACHER_ID, DEFAULT_SUBJECT_ID).catch((error) => console.error('Falha ao gerar as leituras pedagógicas:', error));
}

main();
