import type { Question } from '../../../types/domain';

/** Generic question bank. Authored adaptations cover the seeded demo exam. */
export const QUESTION_BANK: Question[] = [
  {
    id: 'q1', subtopicId: 'EF09MA12', points: 2, source: 'banco',
    statement: 'Para descobrir a altura de um prédio, uma estudante mediu a sombra dele no mesmo instante em que mediu a sombra de um poste. O poste tem 3 m de altura e projeta uma sombra de 2 m. A sombra do prédio mede 12 m. Determine a altura do prédio.',
    authored: {
      dislexia: { text: 'Uma estudante quer saber a altura de um prédio.\n\nDados:\n• Altura do poste = 3 m\n• Sombra do poste = 2 m\n• Sombra do prédio = 12 m\n\nCalcule a altura do prédio.', why: 'Frases mais curtas e dados separados em lista, sem mudar o que é pedido.' },
      tdah: { text: 'Uma estudante quer saber a altura de um prédio.\n\nEtapa 1. Anote os dados: poste 3 m, sombra do poste 2 m, sombra do prédio 12 m.\nEtapa 2. Monte a proporção entre altura e sombra.\nEtapa 3. Calcule a altura do prédio.', why: 'O enunciado virou três etapas, para organizar a atenção sem dar a resposta.' },
      tea: { text: 'Um poste tem 3 metros de altura. A sombra do poste mede 2 metros. Um prédio está ao lado do poste. A sombra do prédio mede 12 metros. As duas sombras foram medidas no mesmo momento. Calcule a altura do prédio, em metros.', why: 'Linguagem literal, uma informação por frase e unidade da resposta explícita.' },
      discalculia: { text: 'Uma estudante quer saber a altura de um prédio.\n\nPoste: altura 3 m, sombra 2 m.\nPrédio: altura h, sombra 12 m.\n\nUse a proporção: h / 12 = 3 / 2.\nCalcule h.', why: 'Proporção montada, mantendo a competência avaliada.' },
    },
  },
  {
    id: 'q2', subtopicId: 'EF09MA13', points: 2, source: 'banco',
    statement: 'Dois navios partem de um mesmo porto. Um segue para o norte e percorre 8 km; o outro segue para o leste e percorre 6 km. Qual é, em quilômetros, a distância que os separa nesse instante?',
    authored: {
      dislexia: { text: 'Dois navios saem do mesmo porto.\n\nDados:\n• Navio 1 foi para o norte: 8 km\n• Navio 2 foi para o leste: 6 km\n\nCalcule a distância entre os navios.', why: 'Dados destacados em lista e frases curtas.' },
      tdah: { text: 'Dois navios saem do mesmo porto.\n\nEtapa 1. Desenhe o triângulo: um lado de 8 km para o norte e outro de 6 km para o leste.\nEtapa 2. Identifique a hipotenusa.\nEtapa 3. Calcule a distância entre os navios.', why: 'Divide a tarefa em etapas e pede um esboço antes do cálculo.' },
      tea: { text: 'Dois navios saem do mesmo porto. O navio 1 percorre 8 quilômetros para o norte. O navio 2 percorre 6 quilômetros para o leste. Calcule a distância, em quilômetros, entre o navio 1 e o navio 2.', why: '"Nesse instante" saiu, pois não muda a conta e pode gerar dúvida.' },
      discalculia: { text: 'Dois navios saem do mesmo porto.\n\nLados: 8 km e 6 km, com ângulo reto entre eles.\n\nUse a fórmula: d² = 8² + 6².\nConsidere 8² = 64 e 6² = 36.\nCalcule d.', why: 'Fórmula montada e quadrados informados, para o foco ficar no raciocínio.' },
    },
  },
  {
    id: 'q3', subtopicId: 'EF09MA13', points: 2, source: 'banco',
    figure: 'triângulo azul e triângulo vermelho',
    statement: 'Observe a figura: o triângulo retângulo azul tem catetos de 6 cm e 8 cm. O triângulo retângulo vermelho tem catetos de 5 cm e 12 cm. Qual dos dois tem a maior hipotenusa? Justifique com seus cálculos.',
    authored: {
      daltonismo: { text: 'Observe a figura: o triângulo retângulo T1 (linha contínua) tem catetos de 6 cm e 8 cm. O triângulo retângulo T2 (linha tracejada) tem catetos de 5 cm e 12 cm. Qual dos dois tem a maior hipotenusa? Justifique com seus cálculos.', why: 'As cores viraram rótulos T1 e T2 e estilos de linha, que não dependem de distinguir azul de vermelho.' },
      dislexia: { text: 'Compare os dois triângulos retângulos.\n\nT1: catetos de 6 cm e 8 cm.\nT2: catetos de 5 cm e 12 cm.\n\nQual tem a maior hipotenusa?\nMostre seus cálculos.', why: 'Dados de cada triângulo separados em linhas próprias.' },
      tdah: { text: 'Compare dois triângulos retângulos.\n\nEtapa 1. Calcule a hipotenusa de T1 (catetos de 6 cm e 8 cm).\nEtapa 2. Calcule a hipotenusa de T2 (catetos de 5 cm e 12 cm).\nEtapa 3. Diga qual é maior.', why: 'Comparação dividida em duas contas e uma conclusão.' },
      tea: { text: 'O triângulo T1 tem catetos de 6 cm e 8 cm. O triângulo T2 tem catetos de 5 cm e 12 cm. Os dois são triângulos retângulos. Calcule a hipotenusa de T1. Calcule a hipotenusa de T2. Escreva qual é maior.', why: '"Justifique" foi trocado por instruções diretas do que escrever.' },
      discalculia: { text: 'Compare dois triângulos retângulos.\n\nT1: 6² + 8² = 36 + 64.\nT2: 5² + 12² = 25 + 144.\n\nUse: hipotenusa² = soma dos quadrados dos catetos.\nQual hipotenusa é maior?', why: 'Fórmula e quadrados informados na própria questão.' },
    },
  },
  {
    id: 'q4', subtopicId: 'EF09MA14', points: 2, source: 'banco',
    statement: 'Três ruas paralelas são cortadas por duas avenidas. Em uma avenida, os trechos entre as ruas medem 30 m e 45 m. Na outra avenida, o trecho correspondente ao de 30 m mede 40 m. Determine a medida do trecho correspondente ao de 45 m.',
    authored: {
      dislexia: { text: 'Três ruas paralelas cortam duas avenidas.\n\nDados:\n• Avenida 1: trechos de 30 m e 45 m\n• Avenida 2: trecho de 40 m e trecho x\n\nO trecho de 40 m corresponde ao de 30 m.\nCalcule x.', why: 'Correspondência entre os trechos destacada em uma linha própria.' },
      tdah: { text: 'Três ruas paralelas cortam duas avenidas.\n\nEtapa 1. Anote os trechos: 30 m e 45 m em uma avenida; 40 m e x na outra.\nEtapa 2. Monte a proporção entre os trechos.\nEtapa 3. Encontre x.', why: 'Situação convertida em sequência de etapas.' },
      tea: { text: 'Três ruas são paralelas. Duas avenidas cruzam essas três ruas. Na avenida 1, os trechos entre as ruas medem 30 metros e 45 metros. Na avenida 2, os trechos medem 40 metros e x metros. O trecho de 40 metros corresponde ao de 30 metros. Calcule x.', why: '"Correspondente" foi explicado com palavras literais.' },
      discalculia: { text: 'Três ruas paralelas cortam duas avenidas.\n\nUse a proporção: 30 / 45 = 40 / x.\nSimplifique: 30 / 45 = 2 / 3.\nDepois resolva 2 / 3 = 40 / x.\nCalcule x.', why: 'Passos intermediários informados.' },
    },
  },
  { id: 'q5', subtopicId: 'EF09MA03', points: 1, source: 'banco', statement: 'Calcule o valor da expressão (√16 + 2³) · 8^(1/3).' },
  { id: 'q6', subtopicId: 'EF09MA09', points: 1, source: 'banco', statement: 'Fatore a expressão x² − 9 e use a fatoração para resolver a equação x² − 9 = 0.' },
  { id: 'q7', subtopicId: 'EF09MA03', points: 1, source: 'banco', statement: 'Escreva 27^(2/3) como um número inteiro, mostrando as etapas do cálculo.' },
  { id: 'q8', subtopicId: 'EF09MA06', points: 1, source: 'banco', statement: 'Para a função f(x) = 2x + 3, construa uma tabela com x = 0, 1, 2 e 3 e esboce o gráfico.' },
  { id: 'q9', subtopicId: 'EF09MA09', points: 1, source: 'banco', statement: 'Resolva a equação x² − 5x + 6 = 0.' },
  { id: 'q10', subtopicId: 'EF09MA19', points: 1, source: 'banco', statement: 'Calcule o volume de um prisma de base retangular com lados de 6 cm e 9 cm e altura de 10 cm.' },
  { id: 'q11', subtopicId: 'EF09MA19', points: 2, source: 'banco', statement: 'Um reservatório cilíndrico tem raio de 2 m e altura de 5 m. Usando π ≈ 3, determine o volume do reservatório.' },
  { id: 'q12', subtopicId: 'EF09MA05', points: 1, source: 'banco', statement: 'Um produto de R$ 200,00 teve aumento de 10% e, depois, desconto de 10%. Qual é o preço final?' },
  { id: 'q13', subtopicId: 'EF09MA09', points: 2, source: 'banco', statement: 'Use produtos notáveis para calcular 102² sem calculadora.' },
  { id: 'q14', subtopicId: 'EF09MA09', points: 2, source: 'banco', statement: 'Um terreno retangular tem área de 40 m², e o comprimento é 3 m maior que a largura. Determine as medidas do terreno.' },
  { id: 'q15', subtopicId: 'EF09MA05', points: 1, source: 'banco', statement: 'Uma aplicação de R$ 500,00 rende 2% ao mês. Qual é o valor após dois meses, com taxas sucessivas?' },
  { id: 'q16', subtopicId: 'EF09MA06', points: 2, source: 'banco', statement: 'Um táxi cobra R$ 5,00 de bandeirada e R$ 3,00 por quilômetro. Escreva a função do valor pago e calcule o preço de uma corrida de 8 km.' },
  { id: 'q17', subtopicId: 'EF09MA20', points: 1, source: 'banco', statement: 'Uma urna tem 3 bolas vermelhas e 2 azuis. Duas bolas são retiradas, sem reposição. Qual é a probabilidade de as duas serem vermelhas?' },
  { id: 'q18', subtopicId: 'EF09MA22', points: 1, source: 'banco', statement: 'Uma pesquisa perguntou o esporte preferido de 40 estudantes. Qual tipo de gráfico é o mais adequado para mostrar a parte de cada esporte no total? Justifique.' },
  { id: 'q19', subtopicId: 'EF09MA16', points: 1, source: 'banco', statement: 'Calcule a distância entre os pontos A(1, 2) e B(4, 6) do plano cartesiano.' },
];
