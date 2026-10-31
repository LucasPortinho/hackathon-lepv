import type { NeedId, Subtopic } from '../../types/domain';

// Textos do agente pedagógico por regras, para as habilidades avaliadas na demo. O pré-requisito vem do grafo da BNCC.
export const TOPIC_NOTES: Record<string, { competency: string; note: (n: string) => string; suggestion: string }> = {
  EF09MA03: { competency: 'Calcular com raízes e expoentes fracionários', note: (n) => `${n} resolve potências inteiras e ainda hesita ao converter expoente fracionário em raiz.`, suggestion: 'Alternar entre as formas de raiz e de potência antes de calcular.' },
  EF09MA05: { competency: 'Aplicar percentuais sucessivos', note: (n) => `${n} calcula cada percentual, mas soma as taxas em vez de aplicá-las em sequência.`, suggestion: 'Usar uma tabela com o valor após cada etapa.' },
  EF09MA06: { competency: 'Relacionar tabela, fórmula e gráfico de uma função', note: (n) => `${n} monta a tabela e ainda não relaciona os coeficientes à forma do gráfico.`, suggestion: 'Comparar gráficos variando um coeficiente por vez.' },
  EF09MA09: { competency: 'Resolver equações do 2º grau por fatoração', note: (n) => `${n} reconhece a equação e tem dificuldade para escolher a fatoração.`, suggestion: 'Exercícios curtos de fatoração guiada antes das equações completas.' },
  EF09MA12: { competency: 'Identificar lados correspondentes em triângulos semelhantes', note: (n) => `${n} monta a proporção, mas nem sempre relaciona os lados correspondentes.`, suggestion: 'Pedir que marque os ângulos iguais antes de escrever a proporção.' },
  EF09MA13: { competency: 'Identificar hipotenusa e catetos para aplicar o teorema', note: (n) => `${n} conhece a fórmula do teorema de Pitágoras, mas ainda hesita em identificar a hipotenusa quando o triângulo aparece em outra posição.`, suggestion: 'Propor triângulos em posições variadas e marcar a hipotenusa antes das contas.' },
  EF09MA14: { competency: 'Escolher entre Pitágoras e Tales em um problema', note: (n) => `${n} resolve cada teorema isolado e hesita ao decidir qual usar no problema.`, suggestion: 'Trabalhar a escolha do teorema antes de resolver as contas.' },
  EF09MA16: { competency: 'Calcular distâncias no plano cartesiano', note: (n) => `${n} localiza os pontos e ainda não enxerga o triângulo retângulo entre eles.`, suggestion: 'Desenhar os catetos no plano antes de aplicar a fórmula.' },
  EF09MA19: { competency: 'Calcular o volume de prismas e cilindros', note: (n) => `${n} confunde a área da base com o volume em problemas contextualizados.`, suggestion: 'Separar o cálculo da área da base e o da altura em exercícios lado a lado.' },
  EF09MA20: { competency: 'Distinguir eventos dependentes e independentes', note: (n) => `${n} calcula a primeira retirada e esquece que o total muda sem reposição.`, suggestion: 'Simular as retiradas com um diagrama de árvore.' },
  EF09MA22: { competency: 'Escolher o gráfico adequado aos dados', note: (n) => `${n} constrói o gráfico, mas nem sempre justifica a escolha do tipo.`, suggestion: 'Comparar o mesmo conjunto de dados em gráficos diferentes.' },
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
