import type { AgentRun } from '../../../types/domain';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

export const agentRuns = (): (AgentRun & { link: NonNullable<AgentRun['link']> })[] => [
  { id: 'r1', agent: 'pedagogico', status: 'atencao', at: ago(9), summary: 'Atualizou 34 perfis do 9º ano B', detail: 'Todos aguardam a sua revisão.', link: { label: 'Abrir painel', to: '/dashboard' } },
  { id: 'r2', agent: 'correcao', status: 'concluido', at: ago(14), summary: 'Leu 34 folhas de resposta de "Fatoração e equações do 2º grau"', detail: '2 folhas com leitura parcial foram sinalizadas.', link: { label: 'Ver prova', to: '/provas/e-equacoes' } },
  { id: 'r3', agent: 'adaptacao', status: 'concluido', at: ago(180), summary: 'Ajustou o formato do diagnóstico de Teorema de Pitágoras às necessidades declaradas', link: { label: 'Ver avaliação', to: '/diagnosticas/d-pitagoras' } },
  { id: 'r4', agent: 'criador', status: 'concluido', at: ago(182), summary: 'Gerou as questões da avaliação de Teorema de Pitágoras', link: { label: 'Ver avaliação', to: '/diagnosticas/d-pitagoras' } },
  { id: 'r5', agent: 'pedagogico', status: 'concluido', at: ago(1500), summary: 'Comparou o 2º e o 3º bimestre do 9º ano B', detail: 'EF09MA13 (teorema de Pitágoras) segue como a habilidade de menor média.', link: { label: 'Abrir painel', to: '/dashboard' } },
  { id: 'r6', agent: 'correcao', status: 'concluido', at: ago(3000), summary: 'Leu 12 folhas de resposta do 9º ano A', link: { label: 'Ver prova', to: '/provas/e-a-1' } },
  { id: 'r7', agent: 'adaptacao', status: 'atencao', at: ago(4400), summary: 'Não adaptou a figura da questão 3 de uma prova antiga', detail: 'A imagem não tinha legenda. Adapte manualmente.', link: { label: 'Ver provas', to: '/provas' } },
];

export const notifications = () => [
  { id: 'n1', title: 'Perfis prontos para revisão', body: 'A IA atualizou 34 perfis do 9º ano B.', at: ago(9), read: false, to: '/dashboard' },
  { id: 'n2', title: 'Leitura concluída', body: '"Fatoração e equações do 2º grau": 34 folhas lidas, 2 com leitura parcial.', at: ago(14), read: false, to: '/provas/e-equacoes' },
];

export const DIAGNOSTIC_CREATED_AT = () => ago(182);
