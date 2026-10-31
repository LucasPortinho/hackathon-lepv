import type { Question } from '../../../types/domain';

/** Generic question bank. Authored adaptations cover the seeded demo exam. */
export const QUESTION_BANK: Question[] = [
  {
    id: 'q1', subtopicId: 'st-senos', points: 2, source: 'banco',
    statement: 'Um topógrafo deseja calcular a largura de um rio sem atravessá-lo. Ele marca dois pontos A e B na mesma margem, distantes 60 m, e observa uma árvore C na margem oposta, obtendo os ângulos CÂB = 75° e CB̂A = 45°. Determine a distância entre os pontos A e C.',
    authored: {
      dislexia: { text: 'Um topógrafo quer medir um rio.\n\nDados:\n• Distância AB = 60 m\n• Ângulo em A = 75°\n• Ângulo em B = 45°\n\nA árvore C está na outra margem.\nCalcule a distância AC.', why: 'Frases mais curtas e dados separados em lista, sem mudar o que é pedido.' },
      tdah: { text: 'Um topógrafo mede um rio.\n\nEtapa 1. Anote os dados: AB = 60 m, ângulo A = 75°, ângulo B = 45°.\nEtapa 2. Encontre o ângulo C do triângulo.\nEtapa 3. Calcule a distância AC.', why: 'O enunciado virou três etapas, para organizar a atenção sem dar a resposta.' },
      tea: { text: 'Os pontos A e B estão na mesma margem de um rio. A distância entre A e B é 60 metros. O ponto C é uma árvore na outra margem. O ângulo em A mede 75°. O ângulo em B mede 45°. Calcule a distância entre A e C, em metros.', why: 'Linguagem literal, uma informação por frase e unidade da resposta explícita.' },
      discalculia: { text: 'Um topógrafo mede um rio.\n\nAB = 60 m. Ângulo A = 75°. Ângulo B = 45°. Ângulo C = 60°.\n\nUse a fórmula: AC / sen B = AB / sen C.\nConsidere sen 45° ≈ 0,7 e sen 60° ≈ 0,9.\nCalcule AC.', why: 'Fórmula de apoio e valores arredondados, mantendo a competência avaliada.' },
    },
  },
  {
    id: 'q2', subtopicId: 'st-cossenos', points: 2, source: 'banco',
    statement: 'Dois navios partem de um mesmo porto em direções que formam entre si um ângulo de 60°. Após certo tempo, um deles percorreu 8 km e o outro 5 km. Qual é, em quilômetros, a distância que os separa nesse instante?',
    authored: {
      dislexia: { text: 'Dois navios saem do mesmo porto.\n\nDados:\n• Navio 1 percorreu 8 km\n• Navio 2 percorreu 5 km\n• Ângulo entre as rotas = 60°\n\nCalcule a distância entre os navios.', why: 'Dados destacados em lista e frases curtas.' },
      tdah: { text: 'Dois navios saem do mesmo porto.\n\nEtapa 1. Desenhe o triângulo: lados 8 km e 5 km, ângulo de 60° entre eles.\nEtapa 2. Escolha a lei adequada.\nEtapa 3. Calcule a distância entre os navios.', why: 'Divide a tarefa em etapas e pede um esboço antes do cálculo.' },
      tea: { text: 'Dois navios saem do mesmo porto. O navio 1 percorre 8 quilômetros. O navio 2 percorre 5 quilômetros. O ângulo entre os dois caminhos mede 60°. Calcule a distância, em quilômetros, entre o navio 1 e o navio 2.', why: '"Certo tempo" e "nesse instante" saíram, pois não mudam a conta e podem gerar dúvida.' },
      discalculia: { text: 'Dois navios saem do mesmo porto.\n\nLados: 8 km e 5 km. Ângulo entre eles: 60°.\n\nUse a fórmula: d² = 8² + 5² − 2 · 8 · 5 · cos 60°.\nConsidere cos 60° = 0,5.\nCalcule d.', why: 'Fórmula montada e cosseno informado, para o foco ficar no raciocínio.' },
    },
  },
  {
    id: 'q3', subtopicId: 'st-cossenos', points: 2, source: 'banco',
    figure: 'triângulo azul e triângulo vermelho',
    statement: 'Observe a figura: o triângulo azul tem lados 7 cm e 10 cm, com ângulo de 60° entre eles. O triângulo vermelho tem lados 5 cm e 8 cm, com ângulo de 120° entre eles. Qual dos dois tem o maior terceiro lado? Justifique com seus cálculos.',
    authored: {
      daltonismo: { text: 'Observe a figura: o triângulo T1 (linha contínua) tem lados 7 cm e 10 cm, com ângulo de 60° entre eles. O triângulo T2 (linha tracejada) tem lados 5 cm e 8 cm, com ângulo de 120° entre eles. Qual dos dois tem o maior terceiro lado? Justifique com seus cálculos.', why: 'As cores viraram rótulos T1 e T2 e estilos de linha, que não dependem de distinguir azul de vermelho.' },
      dislexia: { text: 'Compare os dois triângulos.\n\nT1: lados 7 cm e 10 cm, ângulo de 60°.\nT2: lados 5 cm e 8 cm, ângulo de 120°.\n\nQual tem o maior terceiro lado?\nMostre seus cálculos.', why: 'Dados de cada triângulo separados em linhas próprias.' },
      tdah: { text: 'Compare dois triângulos.\n\nEtapa 1. Calcule o terceiro lado de T1 (7 cm, 10 cm, 60°).\nEtapa 2. Calcule o terceiro lado de T2 (5 cm, 8 cm, 120°).\nEtapa 3. Diga qual é maior.', why: 'Comparação dividida em duas contas e uma conclusão.' },
      tea: { text: 'O triângulo T1 tem lados de 7 cm e 10 cm. O ângulo entre esses lados mede 60°. O triângulo T2 tem lados de 5 cm e 8 cm. O ângulo entre esses lados mede 120°. Calcule o terceiro lado de T1. Calcule o terceiro lado de T2. Escreva qual é maior.', why: '"Justifique" foi trocado por instruções diretas do que escrever.' },
      discalculia: { text: 'Compare dois triângulos.\n\nT1: 7 cm, 10 cm, 60° (cos 60° = 0,5).\nT2: 5 cm, 8 cm, 120° (cos 120° = −0,5).\n\nUse: c² = a² + b² − 2ab · cos θ.\nQual terceiro lado é maior?', why: 'Fórmula e cossenos informados na própria questão.' },
    },
  },
  {
    id: 'q4', subtopicId: 'st-senos', points: 2, source: 'banco',
    statement: 'Em um triângulo inscrito em uma circunferência de raio 10 cm, um dos ângulos mede 30°. Sabendo que a razão entre um lado e o seno do ângulo oposto é igual ao diâmetro da circunferência circunscrita, determine a medida do lado oposto a esse ângulo.',
    authored: {
      dislexia: { text: 'Um triângulo está dentro de um círculo.\n\nDados:\n• Raio = 10 cm\n• Ângulo = 30°\n\nLembre: lado / sen(ângulo oposto) = diâmetro.\nCalcule o lado oposto ao ângulo de 30°.', why: 'Propriedade destacada em uma linha própria.' },
      tdah: { text: 'Um triângulo está dentro de um círculo de raio 10 cm.\n\nEtapa 1. Calcule o diâmetro.\nEtapa 2. Use: lado / sen 30° = diâmetro.\nEtapa 3. Encontre o lado.', why: 'Propriedade convertida em sequência de etapas.' },
      tea: { text: 'Um triângulo tem os três vértices sobre uma circunferência de raio 10 cm. Um ângulo do triângulo mede 30°. A regra é: lado dividido por seno do ângulo oposto é igual ao diâmetro. Calcule o lado oposto ao ângulo de 30°.', why: '"Inscrito" foi explicado com palavras literais.' },
      discalculia: { text: 'Um triângulo está dentro de um círculo de raio 10 cm.\n\nDiâmetro = 2 · 10 = 20 cm.\nsen 30° = 0,5.\nFórmula: lado = diâmetro · sen 30°.\nCalcule o lado.', why: 'Passos numéricos intermediários informados.' },
    },
  },
  {
    id: 'q5', subtopicId: 'st-razoes', points: 1, source: 'banco',
    statement: 'Uma escada de 5 m está apoiada em uma parede, formando um ângulo de 60° com o chão. A que altura da parede está o topo da escada?',
  },
  {
    id: 'q6', subtopicId: 'st-identidades', points: 1, source: 'banco',
    statement: 'Simplifique a expressão (sen²x + cos²x) / (1 + tg²x), indicando as condições de existência.',
  },
  { id: 'q7', subtopicId: 'st-ciclo', points: 1, source: 'banco', statement: 'Determine em qual quadrante está o ângulo de 510° e calcule o valor de sen 510°.' },
  { id: 'q8', subtopicId: 'st-funcoes', points: 1, source: 'banco', statement: 'Esboce o gráfico de f(x) = 2 sen x no intervalo [0, 2π] e indique a amplitude e o período.' },
  { id: 'q9', subtopicId: 'st-equacoes', points: 1, source: 'banco', statement: 'Resolva a equação 2 cos x − 1 = 0 no intervalo [0, 2π].' },
  { id: 'q10', subtopicId: 'st-areas', points: 1, source: 'banco', statement: 'Calcule a área de um triângulo de lados 6 cm e 9 cm que formam entre si um ângulo de 30°.' },
  { id: 'q11', subtopicId: 'st-areas', points: 2, source: 'banco', statement: 'Um terreno triangular tem dois lados de 40 m e 50 m, com ângulo de 150° entre eles. Determine a área do terreno.' },
  { id: 'q12', subtopicId: 'st-razoes', points: 1, source: 'banco', statement: 'Um avião decola sob um ângulo constante de 15°. Após percorrer 2 km em linha reta, qual é sua altura? Use sen 15° ≈ 0,26.' },
  { id: 'q13', subtopicId: 'st-identidades', points: 2, source: 'banco', statement: 'Mostre que (1 − cos²x) · (1 + cotg²x) = 1 para todo x onde a expressão está definida.' },
  { id: 'q14', subtopicId: 'st-equacoes', points: 2, source: 'banco', statement: 'Encontre todas as soluções reais de sen 2x = sen x.' },
  { id: 'q15', subtopicId: 'st-ciclo', points: 1, source: 'banco', statement: 'Converta 225° para radianos e indique o valor de tg 225°.' },
  { id: 'q16', subtopicId: 'st-funcoes', points: 2, source: 'banco', statement: 'A maré de um porto segue h(t) = 3 + 2 cos(πt/6), com t em horas. Determine as alturas máxima e mínima.' },
];
