# Roteiro para criação do manual dos professores — Crayon

## 1. Objetivo e base do documento

Este documento guia a produção de um manual de uso para professores que estão
começando na Crayon. Reúne o mapa da aplicação, a ordem recomendada de aprendizado,
os passos de cada tarefa, as regras que afetam o professor e os pontos que precisam
ser conferidos antes de publicar o manual.

**Base:** leitura do frontend e do backend disponíveis em 31/10/2026, revisão
`d730eda`. O levantamento foi feito no código; as capturas e a validação com um
professor ainda precisam ser realizadas no ambiente de treinamento.

**Público:** professores que precisam organizar turmas, preparar avaliações,
acompanhar resultados e revisar propostas da IA. O manual final deve explicar
ações e resultados em português simples. As referências técnicas deste roteiro
servem ao autor, não precisam aparecer nos capítulos entregues aos professores.

### Estado da plataforma que o manual deve apresentar

- O produto se chama **Crayon** e é uma aplicação web voltada ao professor.
- A execução atual usa um professor de demonstração configurado pelo servidor e
  dados fictícios iniciais. Não há tela de login, criação de conta ou troca de usuário.
- Os alunos não acessam um portal próprio. Na avaliação diagnóstica, o professor
  imprime, aplica e envia as respostas.
- Há integração com IA e também um modo de regras locais. A disponibilidade
  depende da configuração do ambiente. Uma animação de processamento não prova
  que um modelo de IA foi utilizado.
- O professor revisa adaptações, perfis e avaliações diagnósticas. Esses três
  processos de aprovação são independentes.
- O fluxo discutido de entregar ao PED toda a identificação e avaliação de
  competências **ainda não corresponde integralmente ao código desta revisão**.
  O manual não deve apresentá-lo como recurso entregue.

## 2. Mapa completo da navegação

O menu principal contém seis áreas. A página inicial redireciona ao Dashboard.

| Área ou tela | Caminho | O que o professor consegue fazer |
| --- | --- | --- |
| Início | `/` | Acessar o Dashboard automaticamente. |
| Dashboard | `/dashboard` | Filtrar turma, disciplina e período; ler indicadores e mapa de desempenho. |
| Perfil dentro do Dashboard | `/dashboard/alunos/:studentId` | Abrir o painel lateral do aluno, revisar o perfil e navegar entre alunos. |
| Turmas | `/turmas` | Ver em grade ou lista e criar uma turma. |
| Detalhe da turma | `/turmas/:classId` | Editar ou excluir a turma, acessar alunos, criar provas e pastas e organizar provas. |
| Pasta da turma | `/turmas/:classId/pastas/:groupId` | Abrir o detalhe com uma pasta selecionada. Abrir pastas pela tela também pode apenas mudar a seleção local. |
| Provas | `/provas` | Filtrar provas, abrir detalhes, criar, enviar respostas e excluir uma prova. |
| Nova prova | `/provas/nova` | Montar a prova com questões do banco ou questões escritas pelo professor. |
| Envio das respostas | `/provas/enviar` | Escolher a prova, selecionar arquivos e iniciar a correção. |
| Detalhe da prova | `/provas/:examId` | Conferir questões, gabaritos, resolução, versões e atalhos para correção e adaptação. |
| Adaptação da prova | `/provas/:examId/adaptar` | Escolher necessidades declaradas, gerar versões e revisar cada adaptação. |
| Correções | `/provas/:examId/correcoes` | Consultar folhas, imagens, respostas transcritas, comentários e pontos por questão. |
| Avaliações Diagnósticas | `/diagnosticas` | Consultar avaliações e iniciar uma nova para uma turma e habilidades selecionadas. |
| Detalhe da avaliação diagnóstica | `/diagnosticas/:diagnosticId` | Acompanhar etapas, revisar por aluno, editar, aprovar, recusar, publicar, imprimir e enviar respostas. |
| Alunos | `/alunos` | Buscar e filtrar alunos, cadastrar, editar, excluir e abrir perfis. |
| Perfil em página própria | `/alunos/:studentId` | Consultar a leitura pedagógica, habilidades, evolução e apoios; editar e aprovar o perfil. |
| Configurações | `/configuracoes` | Ajustar leitura e acessibilidade, consultar o perfil do professor e mudar o cenário demonstrativo. |
| Endereço inexistente | Qualquer caminho não reconhecido | Ver a mensagem de página inexistente. |

### Elementos que aparecem em várias telas

- **Menu lateral:** atalhos para as seis áreas; pode ser recolhido. Em telas
  menores, aparece recolhido automaticamente.
- **Caminho de navegação:** no alto da página, mostra onde o professor está e
  permite voltar pelos links disponíveis.
- **Busca:** abre pelo botão superior ou por `Ctrl + K` / `⌘ + K`; encontra
  páginas, alunos, turmas e provas. Setas e Enter ajudam a escolher o resultado.
- **Notificações:** o sino mostra avisos; abrir um aviso o marca como lido e pode
  levar ao item relacionado. Há a ação **Marcar como lidas**.
- **Confirmações e mensagens:** exclusões pedem confirmação; ações concluídas e
  falhas apresentam mensagens. O manual deve mostrar os casos relevantes.
- **Sem dados e carregamento:** uma tela vazia não significa necessariamente
  falha. Conferir filtros e o cenário demonstrativo antes de concluir isso.

## 3. Ordem recomendada para o manual

Organizar os capítulos em torno das tarefas do professor:

1. Conhecer a Crayon, o menu, a busca e os limites da demonstração.
2. Criar uma turma e cadastrar os alunos.
3. Organizar pastas e montar uma prova.
4. Informar o gabarito ou enviar o solucionário.
5. Adaptar a prova, quando houver necessidade declarada.
6. Enviar as provas respondidas e conferir a correção.
7. Ler o Dashboard e revisar o perfil de cada aluno.
8. Criar, revisar e aplicar uma avaliação diagnóstica.
9. Enviar novas respostas e acompanhar os resultados.
10. Ajustar acessibilidade, resolver dúvidas e entender exclusões.

O percurso principal de treinamento deve ser:

**Turma → Alunos → Prova → Gabarito → Adaptação, se necessária → Respostas →
Correções → Dashboard → Revisão do perfil → Avaliação diagnóstica → Nova revisão.**

## 4. Turmas e pastas

### Criar e editar turma

**Entrada:** Turmas → **Nova turma**.

1. Informar nome, nível de ensino, ano escolar, escola e ano letivo.
2. Selecionar ao menos uma disciplina.
3. Clicar em **Criar turma**. A aplicação abre a turma criada.
4. Para corrigir os dados depois, abrir a turma e clicar em **Editar**.

Explicar a diferença entre **ano escolar**, como 9º ano, e **ano letivo**, como
2026. O ano escolar orienta a lista de habilidades da BNCC oferecida ao escrever
uma questão; há a opção **Sem ano definido**.

**Regras:** uma turma pode existir sem alunos. Uma disciplina usada por provas ou
avaliações não pode ser retirada da turma. Excluir a turma apaga seus registros
dependentes; detalhar essa ação no capítulo de exclusões.

### Organizar provas em pastas

**Entrada:** abrir uma turma.

1. Clicar em **Nova pasta** ou **Criar primeira pasta**.
2. Dar um nome, como “1º Bimestre” ou “Recuperação”, e confirmar.
3. Abrir a pasta para filtrar as provas.
4. Arrastar uma prova para a pasta ou usar o menu **Mover para** da prova.
5. Quando a mensagem oferecer **Desfazer**, usá-lo para reverter a movimentação.

Mostrar as visualizações Grade e Lista. A pasta é uma forma de organização; não
altera a disciplina nem corrige a prova. Não ensinar renomear ou excluir pastas:
essas ações não estão expostas na interface atual.

## 5. Alunos e necessidades declaradas

**Entrada:** Alunos → **Novo aluno**, ou botão **Alunos** dentro da turma.

1. Informar o nome que deverá aparecer nas folhas de resposta.
2. Selecionar a turma.
3. Registrar apenas necessidades informadas pela escola ou pela família.
4. Clicar em **Cadastrar aluno**.
5. Usar a busca por nome e o filtro de turma para encontrar o cadastro.
6. Usar o lápis para editar ou clicar no nome para abrir o perfil.

O catálogo atual contempla Daltonismo, TDAH, TEA, Dislexia e Discalculia. Explicar
os apoios em linguagem respeitosa, sem apresentar o sistema como ferramenta de
diagnóstico. Deixar tudo desmarcado quando não houver declaração.

**Regras:** alunos com vínculos em provas ou avaliações não podem trocar de turma.
Nome e necessidades continuam editáveis. Remover uma necessidade também remove
referências a ela nos registros de lacunas e itens que a citavam. Um aluno recém
cadastrado pode aparecer sem resultados; isso não equivale a nota zero.

## 6. Provas: criar, localizar e excluir

### Montar uma prova

**Entrada:** Provas → **Nova prova**, ou **Nova prova** dentro da turma/pasta.

1. Preencher título, turma, disciplina, pasta opcional e data de aplicação.
2. Em **Banco de questões**, filtrar por habilidade e selecionar questões.
3. Em **Escrever questão**, informar enunciado, habilidade da BNCC e pontos;
   gabarito e resolução são opcionais nesse momento.
4. Buscar a habilidade por código ou palavra-chave. Conferir a descrição e a
   unidade temática; a lista considera o ano escolar da turma.
5. Clicar em **Adicionar à prova** para incluir a questão escrita.
6. Conferir quantidade e pontuação total. Usar **Subir**, **Descer** e **Remover**
   para ajustar a composição antes de salvar.
7. Clicar em **Salvar prova**; a página de detalhe será aberta.

**Regras:** título e ao menos uma questão são necessários. Trocar a disciplina
limpa a seleção de questões. A data precisa ser conferida pelo professor, pois o
formulário tem uma data inicial fixa. Não há importação de um PDF de enunciados
para montar automaticamente uma prova na interface atual.

### Localizar e entender a situação

Na lista **Provas**, buscar pelo título ou turma e filtrar pela situação:

| Situação visível | Significado para o professor |
| --- | --- |
| Rascunho | Prova criada; pode iniciar adaptações e preparar o gabarito. |
| Aguardando revisão | Existem adaptações a revisar antes de enviar respostas. |
| Versões prontas | A revisão das adaptações foi concluída. |
| Corrigida | Houve processamento das respostas; pode abrir **Ver correções**. |

O botão de lixeira fica na lista **Provas**. Explicar o alcance da exclusão antes
de confirmar; não confundir com remover uma questão enquanto a prova está sendo montada.

## 7. Gabarito e solucionário

**Entrada:** abrir a prova na lista Provas ou dentro da turma.

### Digitar por questão

1. Clicar em **Informar gabarito**, ou **Editar** quando já houver um.
2. Preencher **Gabarito** com a alternativa ou resposta final.
3. Preencher **Resolução** com o caminho esperado, se necessário.
4. Clicar em **Salvar**.

### Enviar a resolução escaneada

1. No cartão **Resolução escaneada**, clicar em **Enviar resolução (PDF, PNG ou JPG)**.
2. Selecionar o solucionário do professor, com as questões identificáveis.
3. Aguardar a leitura e conferir quantas questões foram preenchidas, mantidas ou
   tiveram falha de leitura.
4. Revisar o resultado em cada questão antes de enviar respostas dos alunos.

As origens aparecem como **Seu gabarito**, **Lido da sua resolução** ou
**Do banco de questões**. O texto digitado pelo professor prevalece sobre a
leitura do arquivo. A leitura escaneada exige IA ativa; o preenchimento manual
continua disponível quando ela está desligada.

**Regras:** PDF, PNG, JPG e JPEG são aceitos; a API limita o corpo do envio a 25 MB.
Após a prova ser corrigida, o gabarito fica bloqueado. Alterá-lo não é um caminho
disponível para recalcular notas. Sem gabarito, a correção com IA tenta resolver
a questão; o manual deve orientar a conferência prévia do critério do professor.

## 8. Adaptar a prova e revisar as versões

**Entrada:** detalhe da prova → **Adaptar com IA** ou **Continuar revisão**.

1. Conferir as necessidades selecionadas e a quantidade de alunos declarados.
2. Selecionar as necessidades pertinentes e clicar em **Gerar adaptações**.
3. Aguardar a geração e abrir cada versão pelas abas ou pelo seletor.
4. Comparar **Original** e **Adaptada · rascunho da IA**. Usar **Destacar mudanças**.
5. Ler a justificativa e escolher **Aceitar**, **Recusar** ou **Editar**.
6. Ao editar, conferir o texto e usar **Salvar e aceitar**.
7. Se necessário, usar **Desfazer** para voltar a decisão a pendente.
8. Revisar todas as versões. **Aceitar as restantes** vale para a versão exibida.
9. Clicar em **Concluir revisão** quando não houver adaptações pendentes.

Alunos com mais de uma necessidade podem receber versão combinada nas provas.
Recusar uma adaptação preserva o enunciado original naquela decisão; não exclui
o aluno. Não confundir isso com recusar uma avaliação diagnóstica.

**Limites:** o botão **Exportar versões** da prova apenas exibe uma mensagem de
recurso futuro. Não documentar um download funcional. A mensagem sobre mudar
atribuições dos alunos às versões também não corresponde a um editor exposto
na interface atual. Na diagnóstica, a adaptação automática usa a primeira
necessidade declarada, sem o mesmo fluxo de versões combinadas das provas.

## 9. Enviar respostas e conferir correções

### Preparar e enviar os arquivos

**Entrada:** **Enviar provas dos alunos**, na lista ou no detalhe da prova.

1. Conferir **A qual prova estes arquivos pertencem?**.
2. Enviar as folhas respondidas em PDF, PNG, JPG ou JPEG, com **um aluno por página**
   e nome legível compatível com o cadastro.
3. Arrastar os arquivos ou clicar na área de seleção. Retirar arquivos errados
   pela lixeira antes de iniciar.
4. Verificar os avisos de formato e de questões sem gabarito.
5. Clicar em **Corrigir provas** quando houver arquivos válidos prontos.
6. Aguardar o resumo de folhas lidas, perfis atualizados, habilidades analisadas e
   folhas para conferir.
7. Abrir **Ver correções** e depois **Abrir o painel da turma**.

O solucionário do professor vai no detalhe da prova, não junto das respostas.
Evitar enviar o mesmo conjunto como PDF e como imagens individuais: isso duplica
as folhas. Provas com adaptações ainda em revisão não aparecem para seleção.
O envio binário tem limite de 25 MB por arquivo na API.

### Conferir cada aluno

Na página **Correções**, selecionar a folha na lista. Conferir nome, situação da
leitura, pontos totais, imagem original, resposta transcrita, comentário e pontos
de cada questão. Clicar na imagem abre a folha em tamanho real em outra aba.

- **Em branco:** uma resposta legível em branco vale zero na correção por questão.
- **Não corrigida:** trecho ilegível ou sem pontuação; não deve ser interpretado
  como resposta errada.
- **Conferir:** folha com leitura parcial ou erro, com motivo apresentado.
- **Aluno não identificado:** a correspondência de nome não foi única; a folha
  pode ser consultada, mas não gera nota para um aluno escolhido por aproximação.
- **Sem imagem:** registros antigos podem ter a correção textual sem imagem salva.

**Limites:** essa tela é de consulta. Não há controles para editar manualmente
pontos, transcrição ou associação de uma folha a outro aluno. Orientar a conferir
o cadastro e os arquivos antes de um novo envio, sem prometer uma correção manual
na tela. O modo de regras locais simula o recebimento; não equivale a leitura real
dos arquivos. As barras e etapas de progresso são ilustrativas, sem percentual
garantido de processamento no servidor ou prazo fixo de conclusão.

## 10. Dashboard: interpretar antes de agir

**Entrada:** Dashboard.

1. Escolher turma, disciplina e período.
2. Ler **Média da turma**, **Pedem um olhar**, **Provas processadas** e
   **Adaptações geradas**.
3. Ler o mapa: alunos nas linhas e unidades temáticas nas colunas.
4. Abrir uma unidade para ver as habilidades avaliadas; quando só há uma unidade,
   ela já fica expandida. Só habilidades com dados no período aparecem.
5. Consultar o valor exato passando o ponteiro ou usando foco pelo teclado.
6. Abrir o aluno pelo nome ou por uma célula para ler o perfil lateral.
7. Abrir uma habilidade pelo cabeçalho para ver média, distribuição e alunos que
   podem precisar de apoio. Dali pode iniciar uma avaliação diagnóstica.
8. Em **Exibição**, ajustar valores, padrões e ordenação de alunos e colunas.
9. Usar **Destacar abaixo de** e o controle de corte para explorar resultados.

A escala atual vai de vermelho nos valores menores, passa por amarelo e chega a
verde nos maiores. Apresentar sempre os números e a legenda; os padrões oferecem
outra forma de distinguir faixas. O traço **–** indica ausência de dado, não zero.
No mapa é possível navegar por setas, Home e End; Enter ativa o botão em foco.

### O que os números significam nesta versão

| Informação | Explicação para a redação do manual |
| --- | --- |
| Pontos da prova | Soma dos pontos atribuídos às respostas corrigidas; consultar junto dos trechos sem leitura. |
| Resultado por habilidade | Calculado no backend a partir dos pontos das questões associadas à habilidade. Com nota anterior no período, entra pela média entre resultado anterior e novo. |
| Resultado da unidade | Média das habilidades da unidade com dados para aquele aluno. |
| Resultado geral | Média dos resultados disponíveis por habilidade; não equivale necessariamente à nota final de uma única prova. |
| Pedem um olhar | Conta alunos com média abaixo de 60 ou com pelo menos duas habilidades abaixo de 50. É um indicador para investigação. |
| Painel de uma habilidade | Lista para apoio quem tem resultado abaixo de 60 naquela habilidade. |
| Corte escolhido no mapa | Muda o destaque visual; não altera notas, lacunas nem as regras dos indicadores. |
| Provas processadas e adaptações | Contam provas corrigidas e adaptações aceitas da turma/disciplina; esses dois contadores não são filtrados pelo período selecionado. |

Os resultados numéricos por habilidade são armazenados de 1 a 100. Uma questão
pode receber zero ponto na correção, mas o resultado agregado da habilidade tem
piso 1. A legenda visual começa em zero; explicar essa diferença se o professor
comparar o mapa com uma folha sem acertos.

**Atenção ao contexto:** o mapa respeita o período selecionado. O perfil aberto
mostra o perfil atual da disciplina, não uma cópia histórica do período do mapa.
Resultados novos entram no último período cadastrado, sem seletor de período no
envio. O manual deve evitar prometer uma visão histórica que a tela não entrega.

## 11. Ler, editar e aprovar perfis

**Entrada:** abrir um aluno no Dashboard ou na lista Alunos.

1. Conferir nome, turma, disciplina e resultado geral.
2. Ler a **Leitura pedagógica**, as dificuldades descritas, pré-requisitos e
   sugestões de intervenção.
3. Conferir **Habilidades avaliadas**, comparação com a turma e **Evolução**.
4. Quando houver declaração, abrir **Apoios desta avaliação** para consultar
   necessidades declaradas e versões de provas relacionadas.
5. Clicar em **Editar** para alterar o resumo e as observações de lacunas.
6. Clicar em **Salvar alterações**; o perfil fica editado, aguardando aprovação.
7. Usar **Revisar e aprovar perfil** quando concluir a conferência.
8. Usar **Reabrir revisão**, ou **Desfazer** na mensagem imediata de aprovação,
   caso precise revisar novamente.

| Estado | O que ensinar |
| --- | --- |
| Rascunho da IA | Leitura inicial ainda sem aprovação do professor; pode ter sido gerada por regras locais. |
| Editado por você | Texto salvo pelo professor, ainda aguardando aprovação. |
| Aprovado por você | Revisão concluída; pode ser reaberta. |

**Regras:** editar o perfil não altera notas. Os campos expostos são resumo e
observações das lacunas; não há editor completo de competências, pré-requisitos
ou sugestões. Novas correções e devolutivas recalculam o perfil e o devolvem à
revisão. O enriquecimento de texto em segundo plano pode aparecer depois do
resumo do envio. Não ensinar que toda nova atividade preserva a aprovação antiga.

**Limites:** a lista Alunos e o perfil em página própria usam Matemática como
disciplina padrão, sem seletor nessa página. Para consultar outra disciplina,
usar o Dashboard com o filtro adequado. A memória de leituras revisadas existe
no backend, mas não há tela de histórico de versões do perfil.

## 12. Avaliações diagnósticas e trabalho do CRIA

### Solicitar e acompanhar

**Entrada:** Avaliações Diagnósticas → **Nova avaliação**, ou atalho no painel
de uma habilidade do Dashboard.

1. Selecionar uma turma com alunos.
2. Marcar as habilidades apresentadas, ordenadas da menor média para a maior.
3. Clicar em **Iniciar agentes**.
4. Acompanhar **Agente Pedagógico → Agente Criador → Agente de Adaptação**.
   A adaptação pode aparecer como **Não necessário** quando não houver declaração.
5. Aguardar **Aguardando sua revisão** e selecionar um aluno na lista.

Na implementação atual, a seleção de participantes usa resultados abaixo de 60
em alguma habilidade escolhida. Isso pode produzir um grupo menor que a turma.
Ausência de nota não seleciona um aluno como dificuldade. Se nenhum aluno for
selecionado, a publicação é bloqueada; não há botão para incluir participantes
manualmente. As sugestões da interface usam Matemática como disciplina padrão;
não prometer seleção livre de disciplinas no diálogo atual.

### Revisar antes de publicar

1. Para cada aluno, conferir o foco, enunciados, alternativas, gabarito, resolução,
   pré-requisito e eventual formato adaptado.
2. Atentar ao aviso **Confira o gabarito** quando aparecer.
3. Usar **Editar** para ajustar enunciado, alternativas, gabarito e resolução.
   Alternativas são preenchidas uma por linha.
4. Remover uma questão apenas se restar outra para o aluno. Qualquer alteração
   retira a aprovação anterior desse aluno.
5. Clicar em **Aprovar avaliação** para o aluno, ou **Aprovar todas** depois da
   conferência de todos. **Reabrir** retira a aprovação individual.
6. Se necessário, **Recusar** a avaliação de um aluno o remove desse grupo;
   **Recusar avaliação** descarta a avaliação inteira, mediante confirmação.
7. Clicar em **Publicar** quando todos os participantes estiverem aprovados.

**Regras:** publicação exige pelo menos um participante e aprovação de todos.
O último aluno não pode ser recusado individualmente; é necessário recusar a
avaliação inteira. Recusas e edição só estão disponíveis antes da publicação,
na etapa de revisão. A aprovação de um perfil não publica a diagnóstica.

### Imprimir, aplicar e enviar respostas

1. Na etapa **Aguardando respostas**, usar **Exportar para impressão**.
2. Permitir a janela adicional quando o navegador bloquear pop-ups.
3. Na impressão do navegador, imprimir ou escolher salvar em PDF, se disponível.
4. Aplicar a folha própria de cada aluno, sem entregar os gabaritos da revisão.
5. Clicar em **Enviar respostas** e selecionar as digitalizações.
6. Aguardar a conclusão e abrir o Dashboard para conferir os resultados e
   revisar novamente os perfis.

Aqui a impressão é funcional: abre uma janela de impressão com uma folha por
aluno. O significado de **Publicar** é liberar essa etapa; não envia mensagens
nem disponibiliza uma prova em portal do aluno. **Simular respostas recebidas**
é uma ação de demonstração que altera os resultados por uma regra fixa; não
substitui o envio e a correção de respostas reais.

## 13. Configurações e acessibilidade

**Entrada:** Configurações, pelo menu ou pelo cartão do professor.

- **Reduzir movimento:** Sistema, Reduzir ou Completo.
- **Fonte:** Padrão ou Leitura.
- **Espaçamento:** Padrão ou Confortável.
- **Tema:** Claro ou Escuro.
- **Perfil:** consulta de nome, função e e-mail; não há formulário para editá-los.
- **Cenário dos dados:** Normal, Conexão lenta, Sem dados ou Erro ao carregar.
  A mudança recarrega a página e simula o estado de leitura sem apagar os dados.

Ensinar o professor a usar **Normal** no treinamento de tarefas reais. Preferências
visuais do professor não alteram as necessidades declaradas dos alunos.

## 14. Exclusões: explicar o alcance antes do clique

| Ação | Onde fica | Efeito atual |
| --- | --- | --- |
| Excluir prova | Lixeira na lista Provas | Remove prova, vínculos de questões, versões, adaptações, lotes, folhas e respostas vinculados. Preserva questões do banco, alunos e outras provas. |
| Excluir aluno | Lixeira na lista Alunos | Remove cadastro, notas, perfil, folhas e vínculos dependentes do aluno. |
| Excluir turma | Botão Excluir dentro da turma | Remove turma, alunos, notas, perfis, pastas, provas, diagnósticas e registros dependentes. |
| Recusar diagnóstica inteira | Detalhe, durante revisão | Descarta a avaliação e as atividades dos participantes. |
| Recusar diagnóstica de um aluno | Atividade individual, durante revisão | Remove esse participante e seus itens, mantendo os demais. |

As exclusões acima não têm lixeira de recuperação. Cancelar a confirmação impede
a exclusão. Excluir uma prova **não desfaz os resultados já agregados nem
recalcula os perfis**. Também não é uma promessa de apagar todos os arquivos
físicos enviados: a implementação remove os registros do banco, sem rotina de
limpeza completa desses arquivos. Essa distinção deve constar na orientação
administrativa, sem ensinar exclusão como forma de recalcular notas.

## 15. Dúvidas e resolução de problemas

| Situação | Orientação a incluir no manual |
| --- | --- |
| O mapa não mostra resultados | Conferir turma, disciplina, período, alunos cadastrados e cenário Normal. Só aparecem habilidades com dados. |
| A habilidade não aparece ao escrever questão | Conferir disciplina e ano escolar; procurar pelo código ou outra palavra-chave. |
| A prova não aparece para enviar respostas | Conferir se as adaptações ainda estão em revisão. Concluir essa revisão primeiro. |
| O gabarito não pode ser alterado | A prova já foi corrigida; a interface bloqueia mudanças posteriores. |
| A leitura do solucionário está indisponível | Pode ser ambiente com IA desligada; informar gabarito e resolução manualmente. |
| A folha não foi associada ao aluno | Conferir nome legível, cadastro e um aluno por página. Não há associação manual nessa tela. |
| A correção parece incompleta | Abrir Correções, imagem original e motivo do aviso. Diferenciar branco de ilegível. |
| Não consigo concluir adaptações | Revisar pendências em todas as versões, não apenas na aba exibida. |
| Não consigo publicar a diagnóstica | Conferir participantes e aprovações de todos. Se editar um item, aprovar novamente. |
| Não consigo recusar o último participante | Recusar a avaliação inteira durante a revisão. |
| A impressão não abriu | Autorizar pop-ups do site e tentar novamente. |
| Meu perfil voltou a rascunho | Novos resultados exigem uma nova revisão do professor. |
| A tela está sempre vazia, lenta ou com erro | Em Configurações, conferir Cenário dos dados e selecionar Normal. Se persistir, registrar a mensagem e a tarefa para suporte. |

Não inventar um endereço de suporte ou botão de ajuda: definir o canal da escola
ou da equipe responsável antes de publicar o manual.

## 16. Glossário para o professor

| Termo | Explicação simples |
| --- | --- |
| Habilidade da BNCC | Aprendizagem identificada por código, descrição e ano escolar no catálogo. É associada às questões. |
| Unidade temática | Grupo de habilidades que organiza as colunas do Dashboard. |
| Competência descrita no perfil | O que a leitura pedagógica aponta que o aluno precisa desenvolver; nesta versão não há uma lista completa de competências por questão produzida livremente pelo PED. |
| Lacuna | Dificuldade indicada para investigar e trabalhar; não é uma característica permanente do aluno. |
| Pré-requisito | Aprendizagem anterior que pode precisar de retomada. |
| Solucionário ou resolução | Explicação de como resolver as questões da prova. |
| Gabarito | Resposta final ou alternativa esperada. |
| Leitura parcial | Parte da folha não pôde ser interpretada com segurança. |
| Necessidade declarada | Informação fornecida pela escola ou família, usada para orientar apoios. |
| PED | Agente que ajuda a escrever e aprofundar a leitura pedagógica do desempenho. |
| CRIA | Agente que prepara questões individuais a partir do foco, dificuldade e pré-requisito recebidos. |
| Adaptação | Ajuste de apresentação ou enunciado para uma necessidade declarada, sujeito à revisão. |
| Rascunho | Resultado ainda aguardando a conferência do professor. |

## 17. Modelo de redação para cada tarefa

Usar o seguinte formato no manual final:

1. **O que você vai fazer:** uma frase com o resultado esperado.
2. **Antes de começar:** dados e etapas necessários.
3. **Onde abrir:** nome do menu e botão como aparecem na interface.
4. **Passo a passo:** uma ação por etapa, com verbos diretos.
5. **Como conferir:** o que muda quando a tarefa termina.
6. **Se algo não funcionar:** mensagem provável e próxima ação disponível.
7. **Atenção:** apenas regras diretamente ligadas à tarefa, como exclusão ou bloqueio.

Usar exemplos fictícios consistentes: uma turma, dois alunos, uma prova curta e
uma habilidade presente no ambiente. Explicar primeiro o significado pedagógico;
evitar termos como endpoint, payload, seed ou fallback no texto para professores.
Não apresentar hipóteses como diagnósticos, nem números do Dashboard como uma
sentença sobre a capacidade do aluno.

## 18. Capturas e exercício de treinamento

### Plano de imagens para o manual

| Captura | O que precisa ficar visível |
| --- | --- |
| Visão geral | Menu, busca, caminho de navegação e sino. |
| Cadastro de turma | Ano escolar, ano letivo e disciplinas. |
| Cadastro de aluno | Nome, turma e necessidades declaradas. |
| Organização da turma | Pastas, provas e menu Mover para. |
| Nova prova | Banco, escrita manual, busca BNCC e lista de questões. |
| Gabarito | Campos por questão e cartão Resolução escaneada. |
| Adaptação | Original, adaptada, justificativa e decisões. |
| Envio | Prova selecionada, formatos e lista de arquivos. |
| Correções | Aluno, imagem e resultado por questão, incluindo uma leitura parcial. |
| Dashboard | Filtros, legenda, unidade expandida e opção Exibição. |
| Perfil | Leitura pedagógica, habilidades e estado de revisão. |
| Diagnóstica | Etapas, revisão individual, edição e aprovações. |
| Publicação | Impressão e envio de respostas. |
| Exclusão | Prova escolhida e confirmação com seu alcance. |
| Configurações | Recursos de leitura e cenário Normal. |

Capturar a versão efetivamente usada no treinamento. Utilizar apenas dados
fictícios e evitar incluir gabaritos na imagem destinada à aplicação com alunos.

### Exercício completo de entrada

Criar uma turma de treinamento, cadastrar dois alunos fictícios e montar uma
prova curta. Informar gabarito, enviar respostas de teste e conferir a correção.
Abrir o Dashboard, explicar um resultado e revisar um perfil. Quando houver
aluno elegível, criar uma diagnóstica, revisar, publicar e imprimir. Demonstrar
adaptação somente com necessidade declarada no cadastro fictício.

O conjunto em [Provas fictícias](provas_ficticias.md) usa uma prova e alunos de
uma demonstração anterior. Confirmar os cadastros antes de usá-lo; os exemplos
não são automaticamente compatíveis com a demonstração atual da BNCC. Nunca
orientar professores a executar um reset de banco como parte do uso cotidiano.

## 19. Referência técnica para autores e manutenção

### Mapa entre telas e implementação

| Parte da aplicação | Fontes para conferir o comportamento |
| --- | --- |
| Rotas e menu | [App.tsx](../frontend/src/App.tsx), [nav.ts](../frontend/src/components/shell/nav.ts) |
| Busca e notificações | [CommandPalette.tsx](../frontend/src/components/shell/CommandPalette.tsx), [TopBar.tsx](../frontend/src/components/shell/TopBar.tsx), [search.service.ts](../backend/src/services/search/search.service.ts) |
| Turmas e pastas | [ClassDetailPage.tsx](../frontend/src/features/classes/ClassDetailPage.tsx), [ClassDialog.tsx](../frontend/src/features/classes/ClassDialog.tsx), [class.service.ts](../backend/src/services/classes/class.service.ts) |
| Alunos e declarações | [StudentsPage.tsx](../frontend/src/features/students/StudentsPage.tsx), [StudentDialog.tsx](../frontend/src/features/students/StudentDialog.tsx), [student.service.ts](../backend/src/services/students/student.service.ts) |
| Criação e exclusão de provas | [ExamBuilderPage.tsx](../frontend/src/features/exams/ExamBuilderPage.tsx), [ExamsPage.tsx](../frontend/src/features/exams/ExamsPage.tsx), [exam.service.ts](../backend/src/services/exams/exam.service.ts) |
| Catálogo BNCC | [SkillPicker.tsx](../frontend/src/features/exams/SkillPicker.tsx), [catalog.store.ts](../frontend/src/api/catalog/catalog.store.ts), [bncc.ts](../backend/src/db/seed/data/bncc.ts) |
| Gabarito e solucionário | [AnswerKey.tsx](../frontend/src/features/exams/AnswerKey.tsx), [answer-key.service.ts](../backend/src/services/exams/answer-key.service.ts) |
| Versões e adaptações | [AdaptPage.tsx](../frontend/src/features/exams/AdaptPage.tsx), [adaptation.service.ts](../backend/src/services/adaptations/adaptation.service.ts), [version-planner.ts](../backend/src/services/adaptations/version-planner.ts) |
| Envio e correções | [UploadPage.tsx](../frontend/src/features/upload/UploadPage.tsx), [CorrectionsPage.tsx](../frontend/src/features/exams/CorrectionsPage.tsx), [upload.service.ts](../backend/src/services/uploads/upload.service.ts), [correction.service.ts](../backend/src/services/uploads/correction.service.ts) |
| Mapa e indicadores | [Heatmap.tsx](../frontend/src/features/dashboard/Heatmap.tsx), [SubtopicInsight.tsx](../frontend/src/features/dashboard/SubtopicInsight.tsx), [dashboard.service.ts](../backend/src/services/dashboard/dashboard.service.ts) |
| Perfis e PED | [StudentProfile.tsx](../frontend/src/features/students/StudentProfile.tsx), [profile.service.ts](../backend/src/services/profiles/profile.service.ts), [pedagogical.agent.ts](../backend/src/services/agents/pedagogical.agent.ts), [pedagogical.rules.ts](../backend/src/services/agents/pedagogical.rules.ts) |
| Diagnósticas e CRIA | [DiagnosticDetailPage.tsx](../frontend/src/features/diagnostics/DiagnosticDetailPage.tsx), [diagnostic-agent.service.ts](../backend/src/services/diagnostics/diagnostic-agent.service.ts), [diagnostic-review.service.ts](../backend/src/services/diagnostics/diagnostic-review.service.ts), [diagnostic-results.service.ts](../backend/src/services/diagnostics/diagnostic-results.service.ts) |
| Acessibilidade e demonstração | [SettingsPage.tsx](../frontend/src/features/settings/SettingsPage.tsx), [prefs.tsx](../frontend/src/lib/prefs.tsx), [scenario.ts](../frontend/src/api/client/scenario.ts), [llm.ts](../backend/src/lib/llm.ts) |

### Como as partes se conectam

O frontend React apresenta telas e chama a API em `/api/v1`. O backend Express
valida os pedidos, aplica regras nos serviços e grava os resultados no SQLite.
Os serviços de agentes recebem dados preparados e retornam textos ou questões;
o navegador não chama diretamente o provedor de IA.

| Módulo da API | Dados e responsabilidades |
| --- | --- |
| `/teachers` | Professor configurado e preferências. |
| Catálogos e `/questions/bank` | Disciplinas, períodos, necessidades, habilidades e questões existentes. |
| `/classes` | Turmas, disciplinas, alunos da turma, provas e pastas. |
| `/students` | Cadastros, perfis, edição e revisão pedagógica. |
| `/exams` e `/adaptations` | Provas, gabaritos, versões, decisões de adaptação, correções e imagens. |
| `/uploads` | Lotes, arquivos, folhas e início do processamento de respostas. |
| `/dashboard` | Resultados agregados e análise de habilidades. |
| `/diagnostics` | Seleção, geração, revisão, publicação e retorno das diagnósticas. |
| `/notifications`, `/agent-runs` e `/search` | Avisos, registros de atividade e busca. Não há página própria de “Agentes IA” no menu atual. |

Os principais registros são turma, aluno, necessidade declarada, habilidade,
questão, prova, gabarito da prova, versão, adaptação, lote de envio, folha,
resposta corrigida, resultado por habilidade, perfil, lacuna e avaliação
diagnóstica. As questões podem ser compartilhadas entre provas; excluir uma
prova não deve ser explicado como apagar o banco de questões.

### Limite atual da análise pedagógica

O backend ainda calcula resultados por habilidade, cria o perfil inicial e
seleciona até duas lacunas abaixo de 70. O PED pode aprofundar o texto usando
respostas corrigidas de provas e memória de perfis que o professor revisou; o
contexto é limitado a 40 evidências e três memórias. A resposta complementa as
lacunas escolhidas pelo código, sem criar uma avaliação livre de todas as
competências de cada questão.

O CRIA recebe foco de competência, resultado, natureza da leitura e pré-requisito
para gerar atividades individuais. Se falhar, podem permanecer questões do banco.
As habilidades numéricas do Dashboard continuam vindo da tabela de resultados,
não de uma nova lista de competências produzida pelo PED.

Essa descrição é o retrato da revisão mapeada. Quando o novo contrato do PED for
implementado, atualizar especialmente os capítulos 9 a 12, o glossário e esta
referência. Não copiar afirmações antigas do contrato técnico sem conferência.

## 20. Lista de verificação antes de publicar o manual

- [ ] Registrar a revisão e o ambiente de aplicação do manual.
- [ ] Executar o percurso completo com dados fictícios e verificar os nomes dos botões.
- [ ] Conferir todas as telas da tabela de navegação, inclusive estados vazios e erros.
- [ ] Verificar se a IA está ativa e explicar o que muda no modo demonstrativo.
- [ ] Distinguir upload de respostas, envio do solucionário e criação da prova.
- [ ] Distinguir pontos da prova, resultado por habilidade e média geral.
- [ ] Conferir leitura parcial, identificação de aluno e diferença entre ausência e zero.
- [ ] Explicar as três revisões: adaptação, perfil e avaliação diagnóstica.
- [ ] Mostrar limites de edição, publicação, impressão e exclusão.
- [ ] Não prometer exportação de versões de prova, portal do aluno ou login inexistentes.
- [ ] Não ensinar simulação de respostas como correção real.
- [ ] Garantir que as capturas usem dados fictícios e a mesma versão descrita.
- [ ] Validar o texto com um professor iniciante, que execute as tarefas sem ajuda oral.
- [ ] Definir o canal de suporte e o responsável por atualizar o manual.
- [ ] Revisar novamente as descrições do PED após qualquer mudança no contrato.
