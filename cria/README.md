# CRIA — agente criador de questões

Recebe o diagnóstico de um aluno (feito pelo PED) e devolve questões personalizadas
para preencher a lacuna dele. O professor revisa antes de o aluno ver.

## Como rodar

Requisitos: Node.js 20.6 ou superior.

1. Na raiz do repositório, copie `.env.example` para `.env` e preencha `FEATHERLESS_API_KEY`.
2. Dentro da pasta `cria/`:

```bash
npm run dry    # mostra o foco escolhido para cada aluno, sem chamar o modelo
npm start      # chama o modelo e imprime as questões em JSON
```

Não há dependências para instalar.

## Entrada (diagnóstico do PED)

```json
{
  "aluno": "Ana",
  "materia": "Matemática",
  "competencia": "equações do 1º grau",
  "score": 40,
  "causa": "tecnica",
  "prerequisito": "operações com frações",
  "neurodivergencia": null,
  "contexto": "Mora em Manaus; gosta de futebol"
}
```

- `score`: de 1 a 100.
- `causa`: `"tecnica"` ou `"neurodivergencia"`.
- `prerequisito`, `neurodivergencia`, `contexto`: opcionais (`null`).

## Saída

```json
{
  "aluno": "Ana",
  "foco": { "assunto": "operações com frações", "motivo": "..." },
  "questoes": [
    {
      "enunciado": "...",
      "tipo": "multipla_escolha",
      "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "gabarito": "B",
      "resolucao": "...",
      "dificuldade": "facil"
    }
  ]
}
```

## Regra do pré-requisito

Se a causa é técnica, existe um pré-requisito e o score é menor que 60, o CRIA volta
ao pré-requisito em vez de insistir no assunto novo (`escolherFoco` em `src/cria.js`).

## Arquivos

- `src/prompt.js`: instruções do agente.
- `src/llm.js`: chamada à API da Featherless.
- `src/cria.js`: lógica do agente (foco, validação, nova tentativa se o JSON vier quebrado).
- `src/run.js`: roda os exemplos de `exemplos/diagnosticos.json`.
