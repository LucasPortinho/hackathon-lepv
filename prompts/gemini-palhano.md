# Histórico Completo da Conversa & Decisões de Projeto

Este documento registra todo o histórico de alinhamento, suporte a comandos Git, decisões de arquitetura e divisão de tarefas para a equipe do backend.

---

## 1. Contexto e Status Inicial do Projeto

### Visão Geral
Plataforma backend em **Node.js + Express + TypeScript + SQLite (Drizzle ORM)** para uma ferramenta de avaliação diagnóstica adaptativa pedagógica. O sistema rastreia lacunas de aprendizagem de alunos, considerando perfis neurodivergentes (TDAH, Dislexia, TEA, Daltonismo, Discalculia), gerando mapas de calor e suporte a pareceres pedagógicos para professores.

### Ações de Setup Concluídas
* Instalação de dependências (`express`, `dotenv`, `cors`, `drizzle-orm`, `better-sqlite3`, `typescript`, `tsx`, `drizzle-kit`).
* Configuração do `tsconfig.json` (ES2022, NodeNext).
* Configuração do `drizzle.config.ts` apontando para `sqlite.db` e schema em `./src/db/schema.ts`.

---

## 2. Divisão de Arquitetura e Tarefas (Paulo vs. Lucas)

A arquitetura foi dividida estritamente em camadas para evitar conflitos de *merge*:

| Membro | Camadas sob Responsabilidade | Foco Principal |
| :--- | :--- | :--- |
| **Paulo** | `Routes` e `Controllers` | Validação de entradas (Zod), controle de rotas Express, tratamento de códigos HTTP e middlewares de autenticação. |
| **Lucas** | `Services` e `Repositories` | Regras de negócio, consultas otimizadas no Drizzle ORM, transações SQL, integração/mock de IA e cálculos do Mapa de Calor. |

### Módulos e Rotas Mapeadas
1. **Autenticação e Perfil (`/auth`, `/teachers`)**: Login, perfil do professor e preferências de acessibilidade.
2. **Turmas e Alunos (`/classes`, `/students`)**: Cadastro de turmas, associação de disciplinas e necessidades dos alunos.
3. **Dashboard e Heatmap (`/dashboard`)**: Matriz Aluno × Subtópico com notas (1-100) e atualização de pontuações.
4. **Perfis Pedagógicos (`/profiles`)**: Visualização de notas gerais, variação (*delta*), pontos fortes e registro de lacunas.
5. **Provas e Adaptações (`/exams`, `/adaptations`)**: Criação de provas, disparo do Agente de IA para neurodivergências e aprovação de adaptações.
6. **Avaliações Diagnósticas - AD (`/diagnostics`)**: Execução dos agentes pedagógicos/criadores e aprovação individualizada por aluno.
7. **Uploads e OCR (`/uploads`)**: Leitura de folhas de resposta e acompanhamento do lote de processamento.
8. **Agentes e Notificações (`/notifications`, `/agent-runs`)**: Histórico de auditoria e alertas do sistema.

---

## 3. Resolução de Problemas e Comandos Git Utilizados

Durante o desenvolvimento, diversos cenários de Git/GitHub foram resolvidos:

### 3.1 Limpeza de alterações indesejadas (Reset local)
* **Remover arquivos não rastreados gerados localmente:** `git clean -fd`
* **Descartar alterações em arquivos modificados:** `git reset --hard`
* **Forçar sincronização com o repositório remoto:** `git reset --hard origin/<nome-da-branch>`

### 3.2 Ignorando arquivos temporários (`.gitignore`)
Adição das seguintes regras essenciais ao `backend/.gitignore`:
```gitignore
node_modules/
dist/
.env
*.db
*.db-journal
*.sqlite
```

### 3.3 Tratamento de Branches Divergentes e Merges
* **Mesclar branch remota específica:** `git merge origin/<nome-da-branch>`
* **Reconciliar divergência via Rebase:** `git pull --rebase origin <branch>`
* **Configuração global para rebase futuro:** `git config --global pull.rebase true`

### 3.4 Tentativa de Push em Branch Protegida (`main`)
Quando o push para a `main` foi rejeitado com a mensagem `GH006: Protected branch update failed`, a solução foi:
1. Criar uma nova branch: `git checkout -b feat/minhas-alteracoes`
2. Enviar a nova branch: `git push -u origin feat/minhas-alteracoes`
3. Abrir e aprovar o Pull Request no GitHub.
4. Atualizar a `main` local: `git checkout main && git pull origin main`

---

## 4. Pontos Críticos e Oportunidades de Melhoria Identificadas

Após análise do repositório e do modelo de dados (`schema.md`), identificaram-se os seguintes pontos de atenção imediata:

1. **Campo de Senha em `teachers`**: O schema da tabela precisa incluir a coluna `password_hash` para viabilizar a autenticação no backend.
2. **I/O no SQLite e IA**: Como o `better-sqlite3` é síncrono, chamadas demoradas a APIs de IA devem ser executadas assincronamente fora de transações.
3. **Foreign Keys Habilitadas**: É indispensável rodar `PRAGMA foreign_keys = ON;` na conexão inicial para garantir a integridade referencial do SQLite.
4. **Respostas Assíncronas (HTTP 202 Accepted)**: Requisições pesadas que envolvem agentes de IA devem criar um registro de execução em `agent_runs` e retornar imediatamente, deixando o frontend consultar o progresso via polling.
5. **Otimização de Queries no Heatmap**: Garantir que a consulta da matriz de notas do dashboard não faça buscas individuais por célula, evitando o problema de N+1 queries.
6. **Script de Seed (`seed.ts`)**: Criar um script para popular turmas, professores, alunos e necessidades para rápida recriação do banco `sqlite.db`.