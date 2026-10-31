import type { NeedId, Subtopic } from '../../types/domain';

// Textos do agente pedagógico por regras.
export const TOPIC_NOTES: Record<string, { competency: string; note: (n: string) => string; suggestion: string }> = {
  'st-razoes': { competency: 'Relacionar lados e ângulos no triângulo retângulo', note: (n) => `${n} identifica a razão, mas troca cateto oposto e adjacente em figuras giradas.`, suggestion: 'Propor triângulos em posições variadas antes do cálculo.' },
  'st-ciclo': { competency: 'Localizar ângulos no ciclo', note: (n) => `${n} acerta o primeiro quadrante e ainda confunde os sinais nos demais.`, suggestion: 'Retomar a redução ao primeiro quadrante com o ciclo desenhado.' },
  'st-senos': { competency: 'Aplicar a proporção entre lados e senos', note: (n) => `${n} monta a proporção, mas nem sempre relaciona o lado ao ângulo oposto.`, suggestion: 'Pedir que marque cada par lado e ângulo oposto antes de calcular.' },
  'st-cossenos': { competency: 'Reconhecer o caso de dois lados e o ângulo entre eles', note: (n) => `${n} aplica bem a Lei dos Senos, mas ainda hesita ao escolher qual lei usar quando o enunciado traz dois lados e o ângulo entre eles.`, suggestion: 'Trabalhar a escolha da lei antes de resolver as contas.' },
  'st-funcoes': { competency: 'Interpretar amplitude e período', note: (n) => `${n} esboça o gráfico, mas ainda não relaciona os coeficientes à forma da curva.`, suggestion: 'Comparar gráficos variando um coeficiente por vez.' },
  'st-identidades': { competency: 'Manipular identidades', note: (n) => `${n} conhece a identidade fundamental e tem dificuldade para escolher a substituição.`, suggestion: 'Exercícios curtos de substituição guiada.' },
  'st-equacoes': { competency: 'Encontrar todas as soluções no intervalo', note: (n) => `${n} encontra a primeira solução e esquece as demais do intervalo.`, suggestion: 'Usar o ciclo para listar as soluções antes de escrever a resposta.' },
  'st-areas': { competency: 'Usar a fórmula da área com seno', note: (n) => `${n} tende a usar base vezes altura quando a altura não é dada.`, suggestion: 'Contrapor os dois casos em exercícios lado a lado.' },
  'st-vetores': { competency: 'Decompor vetores em componentes', note: (n) => `${n} decompõe na horizontal e ainda oscila na vertical.`, suggestion: 'Relacionar as componentes às razões trigonométricas.' },
  'st-plano': { competency: 'Identificar forças no plano inclinado', note: (n) => `${n} desenha as forças e confunde o ângulo usado na decomposição.`, suggestion: 'Partir do diagrama de corpo livre.' },
  'st-oblquo': { competency: 'Separar movimentos horizontal e vertical', note: (n) => `${n} ainda mistura os dois movimentos.`, suggestion: 'Resolver um eixo por vez.' },
};

export const genericNotes = (subtopic: Subtopic) => ({
  competency: `Desenvolver ${subtopic.name}`,
  note: (n: string) => `${n} ainda tem resultados abaixo do esperado em ${subtopic.name}.`,
  suggestion: `Retomar ${subtopic.name} com exercícios graduados.`,
});

export const NEED_NOTES: Record<NeedId, { note: (n: string) => string; suggestion: string }> = {
  dislexia: { note: (n) => `Na prova mais recente, enunciados longos tiveram desempenho menor que os curtos no mesmo conteúdo. A dificuldade de ${n} pode se relacionar à necessidade declarada pela escola, mais do que ao conteúdo.`, suggestion: 'Enunciados mais curtos, com dados em lista.' },
  tdah: { note: (n) => `${n} acerta o início das questões longas e perde etapas no final. Isso pode se relacionar à necessidade declarada pela escola.`, suggestion: 'Dividir a questão em etapas numeradas.' },
  tea: { note: (n) => `As questões com expressões figuradas tiveram menos respostas de ${n}. Isso pode se relacionar à necessidade declarada pela escola.`, suggestion: 'Linguagem direta, uma informação por frase.' },
  discalculia: { note: (n) => `${n} monta o raciocínio corretamente e perde pontos nas contas intermediárias. Isso pode se relacionar à necessidade declarada pela escola.`, suggestion: 'Oferecer fórmula de apoio e valores simplificados.' },
  daltonismo: { note: (n) => `Questões que dependem de cores na figura tiveram desempenho menor de ${n}. Isso pode se relacionar à necessidade declarada pela escola.`, suggestion: 'Identificar figuras por rótulo e estilo de linha.' },
};
