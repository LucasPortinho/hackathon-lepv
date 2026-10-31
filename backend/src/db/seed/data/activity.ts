import type { AgentRun } from '../../../types/domain';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

export const agentRuns = (): (AgentRun & { link: NonNullable<AgentRun['link']> })[] => [
  { id: 'r1', agent: 'pedagogico', status: 'atencao', at: ago(9), summary: 'Atualizou 34 perfis do 2º ano B', detail: 'Todos aguardam a sua revisão.', link: { label: 'Abrir painel', to: '/dashboard' } },
  { id: 'r2', agent: 'correcao', status: 'concluido', at: ago(14), summary: 'Leu 34 folhas de resposta de "Identidades e equações"', detail: '2 folhas com leitura parcial foram sinalizadas.', link: { label: 'Ver prova', to: '/provas/e-trig-3' } },
  { id: 'r3', agent: 'adaptacao', status: 'concluido', at: ago(180), summary: 'Ajustou o formato do diagnóstico de Lei dos Cossenos às necessidades declaradas', link: { label: 'Ver avaliação', to: '/diagnosticas/d-cossenos' } },
  { id: 'r4', agent: 'criador', status: 'concluido', at: ago(182), summary: 'Gerou as questões da avaliação de Lei dos Cossenos', link: { label: 'Ver avaliação', to: '/diagnosticas/d-cossenos' } },
  { id: 'r5', agent: 'pedagogico', status: 'concluido', at: ago(1500), summary: 'Comparou o 2º e o 3º bimestre do 2º ano B', detail: 'Lei dos Cossenos segue como o subtópico de menor média.', link: { label: 'Abrir painel', to: '/dashboard' } },
  { id: 'r6', agent: 'correcao', status: 'concluido', at: ago(3000), summary: 'Leu 12 folhas de resposta do 2º ano A', link: { label: 'Ver prova', to: '/provas/e-a-1' } },
  { id: 'r7', agent: 'adaptacao', status: 'atencao', at: ago(4400), summary: 'Não adaptou a figura da questão 3 de uma prova antiga', detail: 'A imagem não tinha legenda. Adapte manualmente.', link: { label: 'Ver provas', to: '/provas' } },
];

export const notifications = () => [
  { id: 'n1', title: 'Perfis prontos para revisão', body: 'A IA atualizou 34 perfis do 2º ano B.', at: ago(9), read: false, to: '/dashboard' },
  { id: 'n2', title: 'Leitura concluída', body: '"Identidades e equações": 34 folhas lidas, 2 com leitura parcial.', at: ago(14), read: false, to: '/provas/e-trig-3' },
];

export const DIAGNOSTIC_CREATED_AT = () => ago(182);
