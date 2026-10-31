# API da demonstração

Base: `/api/v1`. A camada HTTP usa os services existentes e não altera o frontend,
os repositories, os services ou a estrutura do banco. Não há login nem endpoints
`PUT`/`PATCH` nesta entrega, conforme o escopo da demonstração.

## Montagem

```ts
import { createApp } from '../app';

const app = createApp({
  teacherId: 't1', // ID existente nos dados artificiais do backend
  corsOrigin: 'http://localhost:5173',
});

app.listen(3000);
```

Também é possível montar `createApiRouter({ teacherId: 't1' })` em uma aplicação
Express existente, sob `/api/v1`. Nesse caso, configure `express.json()` antes do
roteador e os middlewares `notFound` e `errorHandler` de `src/http/errors.ts` depois.

O professor é fixado na configuração do backend; headers, query strings e corpos
de requisição não selecionam outro professor. Nenhum token é exigido na demo.
`createApp` não abre uma porta automaticamente.

Os imports dos services utilizam a conexão de `src/db/index.ts`. Defina
`DATABASE_PATH` antes de importar a aplicação para usar o banco artificial
preenchido desejado; o padrão existente é `sqlite.db`. A camada HTTP não cria
tabelas nem popula o banco. As consultas que dependem de perfis e notas precisam
dos catálogos de disciplinas, subtópicos e períodos já cadastrados.

## Formato das respostas

As respostas de sucesso retornam diretamente os DTOs de `src/types/domain.ts`,
sem envelope `data`. Assim, os métodos de `frontend/src/services` poderão consumir
os resultados ao serem conectados à API.

- `200`: consulta ou geração síncrona concluída.
- `201`: prova, pasta, diagnóstico ou lote criado.
- `204`: folhas registradas, sem corpo de resposta.
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

`studentNames` e `students` nos detalhes são objetos JSON indexados pelo ID, e não
`Map`s. Quando a integração do frontend for realizada, os métodos que atualmente
devolvem `Map` podem reconstruí-lo com `new Map(Object.entries(resultado))`.

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

## Escopo escolhido para a demo

Não foram criados services ausentes, autenticação, armazenamento de senhas ou
endpoints para criar turmas/alunos, gravar notas ou incluir lacunas. Também não
foram expostos endpoints de edição, movimentação, aprovação, publicação ou marcação
de leitura, incluindo alternativas POST para essas atualizações.

O upload atual recebe os arquivos junto com a criação do lote e só atende provas
regulares. Adicionar arquivos a um lote existente, consultar seu status por HTTP
ou enviar arquivos de diagnósticos depende de serviços adicionais. Esses endpoints
do planejamento não foram simulados nesta camada. O frontend permanece com seus
mocks atuais até a integração ser solicitada.

## Verificação

`npm test` inclui testes HTTP com banco SQLite isolado em memória e dados artificiais,
além dos testes existentes dos services. A compilação pode ser verificada com
`npx tsc --noEmit`.
