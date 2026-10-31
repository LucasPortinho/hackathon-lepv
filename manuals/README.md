# Manuais e documentação da Crayon

Esta pasta reúne os documentos explicativos da aplicação. Comece pelo roteiro do
manual dos professores; os demais arquivos apoiam a redação e a consulta técnica.

## Documentos

| Documento | Para quem e para quê | Situação |
| --- | --- | --- |
| [Guia para criar o manual dos professores](guia_criacao_manual_professores.md) | Autores, formação e suporte: mapa das telas, passos, regras, limitações, exemplos e plano de capturas. | Mapeado no código em 31/10/2026, revisão `d730eda`. |
| [API do backend](api_backend.md) | Desenvolvimento: rotas, formatos de dados, respostas e execução. | Referência existente; há trechos antigos, como a lista de recursos fora do escopo. Conferir as rotas atuais. |
| [Estrutura do banco](schema.md) | Desenvolvimento: tabelas, relações e regras de integridade. | Referência existente de versões anteriores; conferir também as migrações e o esquema atual. |
| [Contrato do PED](contrato_agente_ped.md) | Desenvolvimento e produto: responsabilidades e integração com o CRIA. | Referência anterior: o código atual também envia evidências e memória de perfis revisados e usa pré-requisitos da BNCC. |
| [Planejamento do backend](planejamento_e_divis_o_de_tarefas_do_backend.md) | Equipe técnica: arquitetura e divisão original do trabalho. | Documento de planejamento, não garantia de funcionalidade entregue. |
| [Provas fictícias para testar a correção](provas_ficticias.md) | Formação e testes: arquivos de exemplo e resultados esperados. | Usa o conjunto antigo de trigonometria; conferir a existência da prova e dos alunos no ambiente antes de usar. |

## Organização e leitura

- Os cinco documentos existentes acima foram movidos para cá. Seus conteúdos
  foram preservados, com ajustes de links necessários à mudança de pasta.
- Os caminhos de código em crases nos documentos técnicos mantêm seu contexto
  original: em geral, `src/...` refere-se a `backend/src/...`. Os comandos de
  execução da API devem ser executados em `backend/`.
- O roteiro novo descreve o comportamento encontrado na implementação. Ele
  diferencia funcionalidades operacionais, recursos de demonstração e mudanças
  propostas que ainda não foram implementadas.
- Documentos antigos podem divergir da aplicação. Para escrever o manual,
  confira o roteiro novo e os arquivos de referência indicados nele; valide as
  capturas na versão que será usada pelos professores.

## Arquivos que continuam em seus locais

Os arquivos de instrução de agentes e ferramentas não fazem parte desta
reorganização. O contexto de design em `frontend/.impeccable/` permanece onde a
ferramenta o utiliza. O [histórico de prompts](../prompts/sessao-2026-10-30.md)
permanece em `prompts/`, pois registra uma sessão, e não é um manual de uso.
Os PDFs e as imagens de exemplo continuam em `provas-alunos/`.
