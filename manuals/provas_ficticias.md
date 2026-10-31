# Provas fictícias para testar a correção

Alunos e prova já existem na demonstração: **Lei dos Senos e Lei dos Cossenos**, 2º ano B.

## Como testar

1. Abra a prova e, em "Resolução escaneada", envie [resolucao-do-professor.png](../provas-alunos/resolucao-do-professor.png). As 5 questões ficam com gabarito.
2. Clique em "Enviar provas dos alunos" e envie **ou** [turma-todas-as-folhas.pdf](../provas-alunos/turma-todas-as-folhas.pdf) **ou** os arquivos de [folhas-individuais/](../provas-alunos/folhas-individuais/).
   Enviar os dois corrige cada aluno duas vezes.
3. Clique em "Ver correções" para abrir a prova de cada aluno com a correção por questão.
4. Veja os perfis em Alunos.

Depois de corrigida, a prova trava o gabarito. Para repetir o teste do zero, rode `npm run db:reset` em `backend/`,
que apaga o banco local e refaz a demonstração.

## Gabarito

Q1: 20√6 ≈ 49 m · Q2: 7 km · Q3: vermelho, √129 ≈ 11,4 cm (azul: √79 ≈ 8,9 cm) · Q4: 10 cm · Q5: 13,5 cm²

## O que cada folha testa

| Folha | Situação | Erro esperado |
| --- | --- | --- |
| 01 Ana Beatriz | Tudo certo | Nenhum |
| 02 Bruno | Esquece o termo `-2ab cos` | Lei dos Cossenos, Q2 e Q3 |
| 03 Carolina | Usa cos 120° positivo | Sinal do cosseno em ângulo obtuso, Q3 |
| 04 Davi | Inverte a proporção, usa o raio em vez do diâmetro e esquece o 1/2 | Q1, Q4 e Q5 |
| 05 Eduarda | Questões em branco e resolução incompleta | Q1, Q3 e Q4 sem resposta, Q2 parcial |
| 06 Enzo | Raciocínio certo, erro de conta | Q2 com crédito parcial |
| 07 João Pedro | Nome incompleto na folha | Identificado como João Pedro Lima; Q5 errada |
| 08 Sem nome | Nome em branco | Aparece em Correções para conferência, sem nota para ninguém |
