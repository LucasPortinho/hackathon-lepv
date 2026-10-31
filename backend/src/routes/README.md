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
agentes executam seus efeitos existentes no banco, como criar versões, registrar
atividades e avançar etapas. Não há jobs em background: responder `202` daria a
entender um processamento assíncrono que os services não implementam.

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
{ "name": "respostas.pdf", "size": 2048, "kind": "gabarito", "storagePath": "demo/respostas.pdf" }
```

`storagePath` é opcional. O serviço existente registra metadados e valida a
extensão do nome; não recebe nem grava os bytes de um arquivo. `progress = 100`
nessa resposta é o comportamento do service da demo, não uma confirmação de
upload binário. `kind` aceita `prova` ou `gabarito`.

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
Não há OCR ou inferência de respostas na camada HTTP.

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

`process` executa o agente de correção simulado (`services/agents/correction.agent.ts`):
os bytes dos arquivos não são enviados nem lidos, e o resultado é uma folha por aluno
da turma, com leituras parciais determinísticas.

## Fora do escopo da demonstração

Login, cadastro de turmas e alunos, gravação manual de notas, inclusão de lacunas,
inclusão de arquivos em um lote existente, consulta de status por HTTP e envio de
arquivos de diagnósticos.

## Verificação

`npm test` inclui testes HTTP com banco SQLite isolado em memória e dados artificiais,
além dos testes existentes dos services. A compilação pode ser verificada com
`npx tsc --noEmit`.
