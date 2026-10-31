# Planejamento do Backend: Divisão de Tarefas (Paulo vs. Lucas)

Este documento estabelece o contrato de arquitetura, atribuições, metas e o detalhamento de todas as rotas da API para a plataforma de avaliação diagnóstica adaptativa.

---

## 1. Visão Geral da Arquitetura e Fluxo de Trabalho

A aplicação segue uma arquitetura em camadas bem definida:

```text
[ Cliente / Frontend ]
         │
         ▼
[ HTTP Request ] ──────────► Routes (Paulo)
                                 │
                                 ▼
                             Controllers (Paulo)
                                 │ (DTOs / Tipos)
                                 ▼
                             Services (Lucas)
                                 │
                                 ▼
                           Repositories (Lucas) ──► Drizzle ORM ──► SQLite (sqlite.db)
```

### Contrato de Comunicação entre Paulo e Lucas
1. **Interfaces & DTOs:** Antes de codificar uma rota, Paulo e Lucas definem juntos a interface da requisição (Input DTO) e a resposta esperada (Output DTO).
2. **Tratamento de Erros:** O *Service* de Lucas lança erros de domínio (ex: `NotFoundError`, `ValidationError`, `UnauthorizedError`). O *Controller* do Paulo captura esses erros e converte para os códigos HTTP corretos (`404`, `400`, `401`, `500`).
3. **Desacoplamento:** O Paulo **nunca** chama métodos do Drizzle (`db.select()`) no Controller. O Lucas **nunca** acessa objetos da requisição Express (`req`, `res`) nos Services/Repositories.

---

## 2. Atribuições e Metas

### 🎯 Metas do Paulo (Routes & Controllers)
* **Responsabilidade:** Entrada de dados, validação de requisições, segurança HTTP, middlewares de rotas e formatação de respostas.
* **Metas de Entrega:**
  1. Criar o roteador central (`src/routes/index.ts`) e agrupar por domínios (`auth`, `teachers`, `classes`, `students`, `dashboard`, `exams`, `diagnostics`, `uploads`).
  2. Implementar validação de schemas de entrada em todas as rotas (utilizando `zod` ou `express-validator`).
  3. Criar middleware de autenticação JWT/Session para proteger as rotas do professor.
  4. Garantir respostas HTTP padronizadas com status codes apropriados (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).

### 🎯 Metas do Lucas (Services & Repositories)
* **Responsabilidade:** Regras de negócio, cálculos pedagógicos, consultas ao banco SQLite via Drizzle ORM e integração/mock dos Agentes de IA.
* **Metas de Entrega:**
  1. Implementar as queries Drizzle ORM otimizadas para todas as 36 tabelas e views do banco (`src/repositories`).
  2. Construir os *Services* com a lógica de negócio (`src/services`), como agregação do mapa de calor do dashboard, montagem de perfis pedagógicos e criação dos fluxos da Avaliação Diagnóstica (AD).
  3. Criar as abstrações de integração para os 4 Agentes de IA (Pedagógico, Neurodivergência, Criador e Correção).
  4. Garantir a integridade das transações do SQLite utilizando `db.transaction()` onde houver mutações múltiplas.

---

## 3. Mapeamento Detalhado das Rotas por Módulo

---

### Módulo 1: Autenticação e Perfil do Professor (`/auth`, `/teachers`)

#### 1.1 `POST /api/v1/auth/login`
* **Descrição:** Autentica o professor via e-mail/senha e retorna um token de sessão ou JWT.
* **Paulo (Controller/Route):** Valida formato do e-mail e presença da senha. Retorna o token e os dados básicos do professor.
* **Lucas (Service/Repo):** `TeacherRepository.findByEmail()` busca o registro; `AuthService` valida a hash da senha e assina o token JWT.

#### 1.2 `GET /api/v1/teachers/me`
* **Descrição:** Retorna as informações do perfil do professor logado e suas preferências de acessibilidade/interface.
* **Paulo (Controller/Route):** Extrai o `teacherId` do token via middleware de autenticação.
* **Lucas (Service/Repo):** `TeacherRepository.findByIdWithPreferences()` realiza o join entre as tabelas `teachers` e `teacher_preferences`.

#### 1.3 `PUT /api/v1/teachers/me/preferences`
* **Descrição:** Atualiza as preferências de acessibilidade e tema do professor (motion, font, spacing, theme, sidebar_collapsed).
* **Paulo (Controller/Route):** Valida os enums permitidos (`motionOptions`, `fontOptions`, `spacingOptions`, `themeOptions`).
* **Lucas (Service/Repo):** `TeacherPreferenceRepository.update()` atualiza os campos na tabela `teacher_preferences`.

---

### Módulo 2: Turmas, Disciplinas e Alunos (`/classes`, `/students`)

#### 2.1 `GET /api/v1/classes`
* **Descrição:** Lista todas as turmas associadas ao professor logado, incluindo a contagem total de alunos por turma (usando a view `class_student_counts`).
* **Paulo (Controller/Route):** Recebe o filtro opcional por `year`.
* **Lucas (Service/Repo):** `ClassRepository.findAllByTeacher()` executa a consulta unindo `classes` com a view `class_student_counts`.

#### 2.2 `POST /api/v1/classes`
* **Descrição:** Cria uma nova turma para o professor e associa as disciplinas ministradas nela.
* **Paulo (Controller/Route):** Valida nome, nível, escola, ano e array de `subjectIds`.
* **Lucas (Service/Repo):** `ClassService.createClass()` abre uma transação para inserir na tabela `classes` e criar as relações em `class_subjects`.

#### 2.3 `GET /api/v1/classes/:classId/students`
* **Descrição:** Lista os alunos pertencentes a uma turma específica, incluindo suas necessidades declaradas (TDAH, dislexia, TEA, etc.).
* **Paulo (Controller/Route):** Valida o parâmetro `classId`.
* **Lucas (Service/Repo):** `StudentRepository.findByClassId()` busca alunos e faz join com `student_needs` e `needs`.

#### 2.4 `POST /api/v1/students`
* **Descrição:** Cadastra um novo aluno em uma turma e registra suas necessidades de acessibilidade declaradas.
* **Paulo (Controller/Route):** Valida nome, `classId` e array opcional de `needIds`.
* **Lucas (Service/Repo):** `StudentService.createStudent()` insere o aluno em `students` e as necessidades em `student_needs`.

---

### Módulo 3: Dashboard e Mapa de Calor (`/dashboard`)

#### 3.1 `GET /api/v1/dashboard/heatmap`
* **Descrição:** Retorna a matriz consolidada para o Mapa de Calor (Grid de Alunos x Subtópicos com notas de 1 a 100) para uma turma, disciplina e período letivo.
* **Paulo (Controller/Route):** Captura e valida os query params obrigatórios: `classId`, `subjectId`, `periodId`.
* **Lucas (Service/Repo):** `DashboardService.getHeatmapData()` busca os alunos da turma, os subtópicos da disciplina e cruza com a tabela `scores` para retornar a matriz formatada para o frontend.

#### 3.2 `POST /api/v1/scores`
* **Descrição:** Inserção ou atualização manual/automática da nota de um aluno para determinado subtópico e período.
* **Paulo (Controller/Route):** Valida `studentId`, `subtopicId`, `periodId` e `value` (entre 1 e 100).
* **Lucas (Service/Repo):** `ScoreRepository.upsert()` faz o upsert na tabela `scores` e atualiza a coluna `updated_at`.

---

### Módulo 4: Perfis Pedagógicos e Lacunas de Competência (`/profiles`)

#### 4.1 `GET /api/v1/students/:studentId/profile`
* **Descrição:** Retorna o perfil pedagógico completo do aluno para uma disciplina específica: nota geral (overall), variação (delta), resumo da IA, lista de pontos fortes (`profile_strengths`) e lacunas pedagógicas (`competency_gaps`).
* **Paulo (Controller/Route):** Valida `studentId` na URL e `subjectId` na query string.
* **Lucas (Service/Repo):** `ProfileService.getStudentProfile()` busca dados em `student_pedagogical_profiles`, junta com `profile_strengths` e `competency_gaps`.

#### 4.2 `PATCH /api/v1/students/:studentId/profile/review`
* **Descrição:** Permite ao professor revisar, editar o resumo e alterar o estado do perfil pedagógico (`rascunho`, `editado`, `aprovado`).
* **Paulo (Controller/Route):** Valida `reviewStatus` e campo opcional de resumo editado.
* **Lucas (Service/Repo):** `ProfileRepository.updateReview()` atualiza a tabela `student_pedagogical_profiles` com o novo status e marca a data em `reviewed_at`.

#### 4.3 `POST /api/v1/students/:studentId/gaps`
* **Descrição:** Adiciona uma nova lacuna de competência ou observação ao perfil do aluno.
* **Paulo (Controller/Route):** Valida os dados da lacuna, garantindo que `reading_kind = 'necessidade'` inclua obrigatoriamente um `need_id`.
* **Lucas (Service/Repo):** `CompetencyGapRepository.create()` faz o insert validando os relacionamentos com `subtopics` e `student_needs`.

---

### Módulo 5: Provas Regulares e Adaptações por IA (`/exams`, `/adaptations`)

#### 5.1 `GET /api/v1/exams`
* **Descrição:** Lista as provas regulares cadastradas de uma turma, podendo ser filtradas por pasta (`groupId`).
* **Paulo (Controller/Route):** Valida `classId` e query param `groupId`.
* **Lucas (Service/Repo):** `ExamRepository.findByClass()` lista provas ordenadas pela data mais recente, trazendo o status e contagem de leituras parciais (via `exam_partial_reads`).

#### 5.2 `POST /api/v1/exams`
* **Descrição:** Cria uma nova prova rascunho com o título, turma, disciplina, data e seleciona a lista de questões associadas.
* **Paulo (Controller/Route):** Valida título, data (YYYY-MM-DD), turma, disciplina e lista de `questionIds`.
* **Lucas (Service/Repo):** `ExamService.createExam()` insere o registro em `exams` e cria a ordenação em `exam_questions`.

#### 5.3 `POST /api/v1/exams/:id/adapt`
* **Descrição:** Dispara a execução do **Agente de Neurodivergência** para ler as questões da prova e gerar versões adaptadas com base nos perfis/necessidades dos alunos da turma (Daltonismo, TDAH, Dislexia, etc.).
* **Paulo (Controller/Route):** Recebe o ID da prova e retorna status 202 (Accepted) com os dados da execução criada em `agent_runs`.
* **Lucas (Service/Repo):** `ExamAdaptationService.triggerAgent()` identifica as necessidades dos alunos da turma via `exam_version_students`, invoca o modelo de IA para gerar o texto adaptado e a justificativa (`rationale`), e salva na tabela `adaptations`.

#### 5.4 `PATCH /api/v1/adaptations/:id`
* **Descrição:** Atualiza a decisão do professor sobre uma adaptação gerada pela IA (`pendente`, `aceita`, `rejeitada`) e permite a edição manual do texto adaptado.
* **Paulo (Controller/Route):** Valida se o status enviado é um dos valores do enum `adaptationDecisions`.
* **Lucas (Service/Repo):** `AdaptationRepository.update()` persiste a decisão e o texto refinado pelo professor.

---

### Módulo 6: Avaliações Diagnósticas Adaptativas - AD (`/diagnostics`)

#### 6.1 `POST /api/v1/diagnostics`
* **Descrição:** Inicia a solicitação de criação de uma Avaliação Diagnóstica (AD) para uma turma e disciplina, selecionando os subtópicos a serem diagnosticados.
* **Paulo (Controller/Route):** Valida `title`, `classId`, `subjectId` e o array de `subtopicIds`.
* **Lucas (Service/Repo):** `DiagnosticService.create()` insere a AD na tabela `diagnostics`, associa os subtópicos em `diagnostic_subtopics` e inicializa as etapas em `diagnostic_steps` (pedagógico, adaptação, criador, etc.).

#### 6.2 `POST /api/v1/diagnostics/:id/run-agent`
* **Descrição:** Executa o pipeline de agentes pedagógicos e criadores para a AD:
  1. **Agente Pedagógico:** Avalia o perfil histórico do aluno e determina quais competências de base estão faltando.
  2. **Agente Criador:** Gera questões específicas isoladas para retroceder e encontrar a raiz do problema do aluno.
* **Paulo (Controller/Route):** Recebe o ID do diagnóstico e a etapa a ser executada.
* **Lucas (Service/Repo):** `DiagnosticAgentService.processStage()` executa o loop de retrocesso pedagógico, registra os passos em `diagnostic_steps` e gera as questões individualizadas do aluno na tabela `diagnostic_items`.

#### 6.3 `GET /api/v1/diagnostics/:id`
* **Descrição:** Retorna os detalhes da AD, o progresso atual das etapas do agente e a lista de questões individualizadas geradas para cada aluno (`diagnostic_students` + `diagnostic_items`).
* **Paulo (Controller/Route):** Valida `diagnosticId`.
* **Lucas (Service/Repo):** `DiagnosticRepository.findDetailById()` busca o status da AD, passos finalizados e a prévia do caderno de questões de cada aluno.

#### 6.4 `PATCH /api/v1/diagnostics/:id/students/:studentId/approve`
* **Descrição:** Registra a aprovação humana do professor sobre a avaliação diagnóstica individual gerada para aquele aluno específico.
* **Paulo (Controller/Route):** Valida os parâmetros de ID na URL e o booleano `approved`.
* **Lucas (Service/Repo):** `DiagnosticStudentRepository.setApproval()` atualiza a flag `approved` em `diagnostic_students`.

---

### Módulo 7: Uploads e Processamento de OCR (`/uploads`)

#### 7.1 `POST /api/v1/uploads/batch`
* **Descrição:** Cria um lote de envio para upload de provas corrigidas ou gabaritos de ADs.
* **Paulo (Controller/Route):** Valida se o lote é vinculado a uma prova (`examId`) ou a um diagnóstico (`diagnosticId`).
* **Lucas (Service/Repo):** `UploadBatchRepository.create()` garante a regra onde `exam_id` OU `diagnostic_id` é informado (exclusivo) e registra o lote em `upload_batches`.

#### 7.2 `POST /api/v1/uploads/batch/:id/files`
* **Descrição:** Registra os arquivos enviados no lote (metadados, tipo de arquivo: `prova` ou `gabarito`, tamanho em bytes).
* **Paulo (Controller/Route):** Trata o upload multipart/form-data ou os metadados dos arquivos.
* **Lucas (Service/Repo):** `UploadFileRepository.create()` insere em `upload_files` associando ao `batch_id`.

#### 7.3 `GET /api/v1/uploads/batch/:id/status`
* **Descrição:** Acompanha o status de processamento do lote (etapa atual de 0 a 3, total de folhas lidas, perfis atualizados e notas extraídas).
* **Paulo (Controller/Route):** Valida o ID do lote.
* **Lucas (Service/Repo):** `UploadBatchService.getStatus()` busca o andamento do processamento e o resumo das folhas lidas em `exam_answer_sheets` ou `diagnostic_answer_sheets`.

---

### Módulo 8: Notificações e Execuções dos Agentes (`/notifications`, `/agent-runs`)

#### 8.1 `GET /api/v1/notifications`
* **Descrição:** Retorna a lista de notificações do professor logado com o status de leitura.
* **Paulo (Controller/Route):** Permite filtrar por `unreadOnly=true`.
* **Lucas (Service/Repo):** `NotificationRepository.findByTeacher()` consulta a tabela `notifications` ordenada pela data mais recente (`at DESC`).

#### 8.2 `PATCH /api/v1/notifications/:id/read`
* **Descrição:** Marca uma notificação como lida.
* **Paulo (Controller/Route):** Valida ID da notificação.
* **Lucas (Service/Repo):** `NotificationRepository.markAsRead()` atualiza o campo `read = 1`.

#### 8.3 `GET /api/v1/agent-runs`
* **Descrição:** Histórico de atividades executadas pelos agentes (pedagógico, adaptação, criador, correção) para auditoria e acompanhamento do professor.
* **Paulo (Controller/Route):** Recebe o ID do professor pelo token.
* **Lucas (Service/Repo):** `AgentRunRepository.findByTeacher()` lista a tabela `agent_runs` trazendo os links de contexto para acompanhamento.