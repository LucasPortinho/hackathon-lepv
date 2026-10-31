# API da demonstração

Base: `/api/v1`. A camada HTTP usa os services existentes. A demonstração é de um
único usuário: não há login, e o professor é fixado no servidor. O consumo fica em
`frontend/src/api`, organizado pelos mesmos domínios.

## Execução

```bash
npm run dev       # sobe a API em http://localhost:3333 e cria o banco no primeiro start
npm run db:reset  # apaga os dados e recria a seed
```

`src/server.ts` monta `createApp({ teacherId: DEMO_TEACHER_ID })`. Headers, query
strings e corpos de requisição não selecionam outro professor. `DATABASE_PATH` e
`PORT` são opcionais; os padrões são `sqlite.db` e `3333`. `src/db/setup.ts` cria
as tabelas `STRICT`, os triggers e o `user_version`; a seed fica em `src/db/seed`.

## Formato das respostas

As respostas de sucesso retornam diretamente os DTOs de `src/types/domain.ts`,
sem envelope `data`. Os módulos de `frontend/src/api` consomem esses DTOs.

- `200`: consulta ou geração síncrona concluída.
- `201`: prova, pasta, diagnóstico ou lote criado.
- `204`: atualização concluída, sem corpo de resposta.
- `400`: parâmetros, corpo ou regra de entrada inválidos.
- `404`: rota/recurso inexistente ou recurso de outro professor.
- `409`: operação incompatível com o estado atual do fluxo.
- `413`: JSON acima de 1 MB na aplicação criada por `createApp`.
- `500`: erro inesperado, com mensagem pública genérica.

Erros seguem este contrato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Requisição inválida.",
    "details": [{ "path": "query.classId", "message": "..." }]
  }
}
```

`details` aparece nos erros de validação Zod. Os códigos de erro de domínio são
`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT` e `UNAUTHORIZED`; o último continua
mapeado para eventuais services que já utilizem esse erro, sem implementar login.
Falhas de leitura do corpo usam `INVALID_REQUEST` ou `PAYLOAD_TOO_LARGE`.

## Consultas

| Método e caminho | Parâmetros | Retorno |
| --- | --- | --- |
| `GET /teachers/me` | Nenhum | `Teacher` com campo adicional `preferences` |
| `GET /subjects` | Nenhum | `Subject[]` |
| `GET /subjects/:subjectId/subtopics` | ID na URL | `Subtopic[]` |
| `GET /periods` | Nenhum | `Period[]` |
| `GET /needs` | Nenhum | Catálogo de necessidades: `id`, `label`, `hint` |
| `GET /questions/bank` | Nenhum | `Question[]` |
| `GET /classes` | `year` opcional, inteiro de 1 a 9999 | `Class[]` |
| `GET /classes/:classId` | ID na URL | `Class` |
| `GET /classes/:classId/students` | `subjectId` opcional | `Student[]` |
| `GET /classes/:classId/exams` | ID na URL | `Exam[]` |
| `GET /classes/:classId/groups` | ID na URL | `ExamGroup[]` |
| `GET /students` | `subjectId` obrigatório | `StudentSummary[]` |
| `GET /students/:studentId` | `subjectId` obrigatório | `StudentDetail` |
| `GET /students/:studentId/profile` | `subjectId` obrigatório | `PedagogicalProfile` |
| `GET /dashboard/heatmap` | `classId`, `subjectId`, `periodId` obrigatórios | `DashboardData` |
| `GET /dashboard/subtopics/:subtopicId/insight` | Mesma query do heatmap | `SubtopicInsight` |
| `GET /exams` | `classId` e `groupId` opcionais | `Exam[]` |
| `GET /exams/:id` | ID na URL | `{ exam, questions }` |
| `GET /exams/:id/need-counts` | ID na URL | Objeto `{ necessidade: quantidade }` |
| `GET /exams/:id/adaptations` | ID na URL | `{ exam, versions, adaptations, studentNames }` |
| `GET /diagnostics` | Nenhum | `Diagnostic[]` |
| `GET /diagnostics/suggestions` | `classId`, `subjectId` obrigatórios | `{ subtopic, average }[]` |
| `GET /diagnostics/:id` | ID na URL | `{ diagnostic, students, className }` |
| `GET /notifications` | `unreadOnly=true` ou `unreadOnly=false`, opcional | `AppNotification[]` |
| `GET /agent-runs` | `agent` opcional | `AgentRun[]` |
| `GET /search` | `q` opcional | `SearchResult[]` |

`studentNames` e `students` nos detalhes são objetos JSON indexados pelo ID.
`frontend/src/api` os reconstrói como `Map`.

O endpoint de alunos da turma reutiliza a consulta de alunos do service de perfis;
por isso também depende de haver um período letivo cadastrado. O `subjectId`
opcional usa a primeira disciplina da turma quando não é informado. Não cria
perfis ao listar alunos. Já as consultas de detalhe/perfil preservam o comportamento
existente de gerar e salvar um perfil quando ainda não há um.

## Criação e geração

| Método e caminho | Corpo JSON | Retorno |
| --- | --- | --- |
| `POST /classes/:classId/groups` | `{ "name": "1º Bimestre" }` | `201`, `ExamGroup` |
| `POST /exams` | Exemplo abaixo | `201`, `Exam` |
| `POST /exams/:id/adapt` | `{ "needs": ["dislexia", "tdah"] }` | `200`, `ExamVersion[]` |
| `POST /diagnostics` | `{ "classId": "c1", "subtopicIds": ["st-cossenos"] }` | `201`, `Diagnostic` |
| `POST /diagnostics/:id/run-agent` | `{ "stage": "pedagogico" }`, `{}` ou sem corpo | `200`, `Diagnostic` atualizado |
| `POST /uploads/batch` | `{ "examId": "e1", "files": [...] }` | `201`, `{ id, examId, files }` |
| `POST /uploads/batch/:id/sheets` | `{ "sheets": [...] }` | `204`, sem corpo |

Esses POSTs delegam aos services atuais. A geração de adaptações e o avanço dos
agentes aguardam o modelo e respondem ao terminar, o que pode levar minutos em turmas grandes.

Uma prova aceita questões existentes e manuais na mesma lista, como no frontend:

```json
{
  "title": "Prova de trigonometria",
  "classId": "c1",
  "subjectId": "mat",
  "groupId": null,
  "date": "2026-11-12",
  "questions": [
    { "id": "q1" },
    { "statement": "Calcule o lado.", "subtopicId": "st-senos", "points": 0.5 }
  ]
}
```

Objetos completos `Question` do frontend, com `id` e metadados, também são aceitos;
apenas o ID é encaminhado ao service para questões existentes. Alternativamente,
é aceito `questionIds: ["q1", "q2"]` no lugar de `questions`, conforme o planejamento.
Enviar os dois campos é inválido. `groupId` omitido assume `null`.

O título e a disciplina do diagnóstico são derivados dos subtópicos pelo service.
Se `stage` for informado em `run-agent`, precisa coincidir com a etapa atual; uma
etapa desatualizada retorna `409`. Sem `stage`, avança o agente atual. Ao chegar à
revisão, novas chamadas de geração retornam `409`.

Metadados de arquivo:

```json
{ "name": "respostas.pdf", "size": 2048, "kind": "respostas", "storagePath": "demo/respostas.pdf" }
```

`storagePath` é opcional. `kind` aceita `prova` ou `respostas`; apenas os arquivos `respostas`, com as provas dos alunos, são corrigidos.

Folha já interpretada:

```json
{
  "sheets": [
    { "studentId": "ana", "readStatus": "completa" },
    { "studentName": "Aluno não identificado", "readStatus": "parcial", "partialReason": "Questão ilegível" }
  ]
}
```

`readStatus` aceita `pendente`, `completa`, `parcial` e `erro`.
Essa rota registra folhas já interpretadas por outro sistema; ela não chama o agente.

## Atualizações

| Método e caminho | Corpo JSON | Retorno |
| --- | --- | --- |
| `PUT /teachers/me/preferences` | Qualquer subconjunto de `motion`, `font`, `spacing`, `theme`, `sidebarCollapsed` | `200`, preferências |
| `PATCH /exams/:id/group` | `{ "groupId": "g1" }` ou `{ "groupId": null }` | `204` |
| `POST /exams/:id/adaptations/finish` | Sem corpo | `204`; `409` com adaptações pendentes |
| `PATCH /adaptations/:id` | `{ "decision": "aceita" }` ou `{ "adapted": "Texto" }` | `204` |
| `PATCH /students/:studentId/profile/review?subjectId=` | `{ "reviewStatus": "aprovado" }`, `{ "reviewStatus": "rascunho" }` ou `{ "reviewStatus": "editado", "summary": "...", "gapNotes": {} }` | `204` |
| `PATCH /diagnostics/:id/students/:studentId/approve` | `{ "approved": true }` | `204` |
| `POST /diagnostics/:id/approve-all` | Sem corpo | `204` |
| `POST /diagnostics/:id/publish` | Sem corpo | `204`; `409` sem aprovação de todos |
| `POST /diagnostics/:id/answers` | Sem corpo | `204`; simula as respostas recebidas |
| `POST /uploads/batch/:id/process` | Sem corpo | `200`, `UploadSummary` |
| `PATCH /notifications/:id/read` | Sem corpo | `204` |
| `PATCH /notifications/read` | Sem corpo | `204`; marca todas como lidas |

`process` lê as folhas enviadas com o agente de correção e devolve o resumo. Lotes de
prova e de diagnóstico usam a mesma rota. Antes dele, envie cada arquivo:

| Método e caminho | Corpo | Retorno |
| --- | --- | --- |
| `POST /uploads/batch` | `{ "examId": "e1", "files": [...] }` ou `{ "diagnosticId": "d1", "files": [...] }` | `201`, lote com o `id` de cada arquivo |
| `PUT /uploads/batch/:id/files/:fileId/content` | Bytes do arquivo, até 25 MB | `204` |

## Turmas, alunos e recusas

| Método e caminho | Corpo JSON | Retorno |
| --- | --- | --- |
| `POST /classes` | `{ "name", "level", "school", "year", "subjectIds": ["mat"] }` | `201`, `Class` |
| `PUT /classes/:classId` | Mesmo corpo | `200`, `Class`; `409` ao tirar disciplina em uso |
| `DELETE /classes/:classId` | Sem corpo | `204` |
| `POST /students` | `{ "name", "classId", "declaredNeeds": ["tdah"] }` | `201`, `Student` |
| `PUT /students/:studentId` | Mesmo corpo | `200`, `Student`; `409` ao trocar de turma com provas ou diagnósticos |
| `DELETE /students/:studentId` | Sem corpo | `204` |
| `DELETE /diagnostics/:id` | Sem corpo | `204`; só em revisão, descarta a avaliação |
| `DELETE /diagnostics/:id/students/:studentId` | Sem corpo | `204`; só em revisão, tira o aluno da avaliação |

Excluir uma turma é definitivo e apaga junto alunos, notas, perfis, provas, pastas,
diagnósticos e folhas dela. Excluir um aluno apaga as notas, o perfil e as folhas dele.
Ao remover uma necessidade declarada, lacunas e itens que a citavam deixam de citá-la.

## Agentes

Os agentes usam o modelo de `FEATHERLESS_MODEL` (`backend/.env`). Sem chave, ou com
`AGENTS_MODE=regras`, usam regras locais. Chamadas ao modelo nunca ficam dentro de
transações, e pedidos repetidos reaproveitam a execução em andamento.

| Agente | Quando roda | Se o modelo falhar |
| --- | --- | --- |
| Pedagógico | Etapa do diagnóstico; em segundo plano no start, após correções e devolutivas | Mantém o rascunho das regras |
| Criador | Etapa do diagnóstico, um conjunto de questões por aluno | Mantém as questões do banco |
| Adaptação | `POST /exams/:id/adapt` e etapa do diagnóstico | Usa as regras de adaptação |
| Correção | `POST /uploads/batch/:id/process` | Marca a folha como erro; nunca inventa nota |

Nota, variação e quais lacunas existem são calculadas em código. Uma necessidade só é
citada se tiver sido declarada, e uma nota só vai para o aluno com correspondência
única de nome. O diagnóstico passa por Pedagógico, Criador e Adaptação, nessa ordem,
porque só se adapta o que já existe. Cada página enviada é a folha de um aluno, e o
resultado entra na nota do período atual pela média com a nota anterior.

`npm run demo:sheets [provaId] [diagnosticoId]` gera folhas fictícias em `demo-sheets/`.

## Fora do escopo da demonstração

Login, cadastro de turmas e alunos, gravação manual de notas, inclusão de lacunas e
consulta de status do lote por HTTP.

## Verificação

`npm test` inclui testes HTTP com banco SQLite isolado em memória e dados artificiais,
além dos testes existentes dos services. A compilação pode ser verificada com
`npx tsc --noEmit`.


## Metadados de criação e contrato PED → CRIA

Questões manuais em `POST /exams` aceitam estes campos opcionais adicionais:

```json
{
  "statement": "Quanto é 2 + 2?",
  "subtopicId": "st-cossenos",
  "points": 1,
  "alternatives": ["A: 2", "B: 4"],
  "answerKey": "B",
  "solution": "Somando duas unidades a duas unidades, obtemos quatro.",
  "difficulty": "facil",
  "checkResult": "ok"
}
```

`difficulty` aceita `facil`, `media` e `dificil`; `checkResult` aceita `ok`,
`divergente` e `nao_verificavel`. Quando omitidos, a dificuldade fica ausente e a
checagem fica `nao_verificavel`. Alternativas omitidas ficam como `[]`.
O resultado de checagem é recebido do agente; a API não executa uma verificação
matemática automática. As rotas de leitura de questões, provas e diagnósticos
retornam os novos campos sem remover os campos existentes do frontend.

| Método e caminho | Uso | Resposta |
| --- | --- | --- |
| `GET /diagnostics/:id/creator-context` | Entrada do CRIA após a seleção do PED | `{ diagnosticId, classId, subjectId, students: [{ student, focus, gaps, items }] }` |
| `POST /diagnostics/:id/students/:studentId/items` | Persiste o conjunto de itens produzido pelo CRIA para um aluno selecionado | `200`, `DiagnosticForStudent` |

Cada lacuna em `gaps` pode conter `prerequisite`, o pré-requisito textual informado
pelo PED. Os itens também aceitam `prerequisite`. Se omitido, o service usa o
pré-requisito da lacuna correspondente ao subtópico, quando disponível.

Corpo do registro de itens:

```json
{
  "items": [{
    "id": "cria-1",
    "subtopicId": "st-cossenos",
    "statement": "Resolva x + 2 = 4.",
    "alternatives": ["A: x = 2", "B: x = 4"],
    "answerKey": "A",
    "solution": "Subtraindo 2 dos dois lados, temos x = 2.",
    "difficulty": "facil",
    "checkResult": "ok",
    "prerequisite": "Resolver equações de primeiro grau."
  }]
}
```

O POST substitui atomicamente o conjunto anterior do aluno e remove a aprovação
anterior, pois o conteúdo foi alterado. Exige a etapa `criador` ou `revisao`,
antes da publicação. IDs repetidos, subtópicos não selecionados e adaptações para
necessidades não declaradas são rejeitados. Os endpoints respeitam o professor
configurado na demo e não mudam a camada de frontend.

A inicialização migra bancos na versão 1 para a versão 2 sem recriar os dados. O
reset explícito da demo continua disponível separadamente.

## Gabarito da prova

| Método | Rota | Descrição |
| --- | --- | --- |
| `PUT` | `/exams/:id/questions/:questionId/key` | Informa `answerKey` e `solution` da questão nesta prova; `null` limpa. Devolve 204. |
| `PUT` | `/exams/:id/solution?name=resolucao.pdf` | Corpo binário com a resolução escaneada. A IA preenche o gabarito das questões e devolve `{ read, kept, total, failedPages }`. |

Depois da correção as duas rotas respondem 409. Sem IA ativa, a resolução escaneada também responde 409.
`GET /exams/:id` devolve em cada questão o gabarito que vale para a prova e `keySource` (`professor`, `resolucao` ou `banco`).
