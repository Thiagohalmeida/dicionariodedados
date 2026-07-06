# Requisitos — Validador de Dicionário de Dados

Documento de requisitos funcionais e não-funcionais do produto.

---

## Contexto e Objetivo

Estamos na área de compras para produtos de medicamentos, Laboratorios, material hospitalar  e nutrição. A área de compra não tem processos de dados estruturados dados e o momento é de  criação dessa governança de dados. A ferramenta tem o objetivo de entender os arquivos que estão no formato excel, entender todos os campos e criar um *dicionário de dados* como parte da proposta técnica. Após a criação desse dicionario, a ferramenta terá a funcionalidade de exportação de arquivos DDL e contrato de dados.  Informações que serão utilizadas para a criação do banco de dados ou equivalente nesse momento de estruturação. 

O **Validador Dados Suprimentos* é uma plataforma web de validação colaborativa que estrutura esse processo, gera evidências de governança e produz métricas de qualidade dos dados.

---

## Perfis de Usuário

| Perfil | Descrição | Principais ações |
|---|---|---|
| **Especialista de Dados** | Profissional de TI / dados que estrutura os dicionários | Importar, organizar e exportar dicionários |
| **Validador** | Membro da equipe de compras ou gestão hospitalar | Revisar e validar campos usando os critérios de qualidade |
| **Gestor / Auditor** | Supervisor do processo de governança | Acompanhar métricas no dashboard, consultar campos críticos |

> v1 não implementa autenticação por perfil; o nome do validador é informado livremente no momento da validação.

---

## Requisitos Funcionais

### RF01 — Importação de Dicionário de Dados via JSON
- O sistema deve permitir a importação de dicionários no formato JSON padronizado.
- O JSON deve conter: `processo`, `categoria`, `tabela` e array `campos[]`.
- Cada campo deve ter: `nomeTecnico`, `tipo`, `periodicidade`, `chave` (boolean), `descricao`.
- O sistema deve exibir um botão "Usar exemplo" para facilitar testes com dado de amostra.
- Após a importação, o dicionário deve aparecer na listagem com status inicial "Pendente".

### RF01B — Importação de Dicionário de Dados via Excel
- O sistema deve permitir upload de arquivos `.xlsx`, `.xls` ou `.xlsm` (máx. 20 MB) como fonte alternativa de importação.
- O usuário deve informar `processo` e `categoria` (obrigatórios); `tabela` e `aba_preferencial` são opcionais.
- O sistema deve detectar automaticamente a aba mais relevante da planilha com base em uma pontuação (volume de linhas, colunas válidas, posição), respeitando a aba preferencial quando informada.
- O sistema deve filtrar colunas consideradas ruído (cabeçalhos contendo termos como `%`, `∆`, `variação`, `projeção`, `meta`, `budget`).
- O sistema deve converter os cabeçalhos das colunas para `snake_case` como nome técnico do campo.
- O sistema deve inferir automaticamente o tipo de dado de cada coluna (`date`, `decimal`, `int` ou `string`) a partir dos valores amostrados.
- Ao concluir o processamento, o sistema deve exibir um resumo com: aba utilizada, total de colunas lidas, colunas removidas por ruído e abas ignoradas (com motivo).
- O dicionário resultante deve ser criado com status inicial "Pendente", assim como na importação via JSON.

### RF02 — Listagem de Dicionários
- O sistema deve exibir todos os dicionários importados com: nome da tabela, processo, categoria, quantidade de campos, score médio e status.
- O status deve ser calculado dinamicamente a partir das validações existentes.

### RF03 — Visualização de Dicionário
- O sistema deve exibir todos os campos de um dicionário com: nome técnico, tipo de dado, periodicidade, indicador de chave, pontuação individual e status de validação.
- O usuário deve conseguir abrir o painel de validação de qualquer campo diretamente nessa tela.

### RF04 — Validação de Campo
- O sistema deve apresentar 5 critérios de qualidade binários (sim/não) para cada campo:
  1. Campo utilizado no processo
  2. Campo obrigatório
  3. Nome técnico correto
  4. Origem do dado correta
  5. Possui regra de negócio definida
- O validador deve informar seu nome ao submeter a validação.
- O score do campo deve ser calculado automaticamente (cada critério = 20 pontos, máx. 100).
- Múltiplas validações de validadores diferentes devem ser aceitas para o mesmo campo.

### RF05 — Classificação Automática por Score
- O sistema deve classificar cada campo com base no score calculado:
  - **Confiável**: score ≥ 90
  - **Atenção**: score entre 60 e 89
  - **Crítico**: score < 60
  - **Pendente**: nenhuma validação registrada

### RF06 — Detecção de Conflito
- O sistema deve detectar automaticamente quando um mesmo campo possui validações aprovadas (score ≥ 60) e reprovadas (score < 60) de validadores diferentes.
- Campos com conflito devem ser exibidos com status **Conflito**.

### RF07 — Dashboard de Governança
- O dashboard deve exibir as seguintes métricas globais:
  - Total de dicionários cadastrados
  - Total de campos cadastrados
  - Taxa de aprovação (% de campos com score ≥ 60)
  - Pontuação média dos campos validados
- O dashboard deve listar os dicionários recentes com seus respectivos scores e status.

### RF08 — Campos Críticos
- O sistema deve oferecer uma visão cruzada de todos os campos com score < 60 em todos os dicionários.
- A listagem deve exibir: nome do campo, dicionário de origem, score e status.

### RF09 — Exportação de Dicionário
- O sistema deve permitir exportar o dicionário validado em quatro formatos, disponíveis em um menu único de exportação:
  - **JSON** — estrutura completa com campos e validações
  - **CSV** — tabela plana para uso em planilhas
  - **DDL** — script SQL `CREATE TABLE` com tipos mapeados e marcação de chave primária, para uso direto em modelagem de banco de dados
  - **Data Contract** — documento JSON estruturado com processo, categoria, tabela e metadados de cada campo (tipo, obrigatoriedade, origem, periodicidade), destinado a times de engenharia de dados

### RF10 — Página de Apresentação (Sobre)
- O sistema deve ter uma página pública explicando:
  - O que é a plataforma e para quem se destina
  - O processo de validação em 4 etapas
  - Os 5 critérios de qualidade e suas classificações
  - O impacto do uso no contexto de compras em saúde

### RF11 — Onboarding de Novos Usuários
- Na primeira visita, o sistema deve exibir automaticamente um tutorial em 4 passos:
  - Introdução à plataforma
  - Explicação dos 5 critérios de validação
  - Explicação do sistema de pontuação e classificação
  - Passo a passo para começar a validar
- O tutorial deve ser armazenado localmente (`localStorage`) para não reaparecer em visitas subsequentes.
- O usuário deve poder rever o tutorial a qualquer momento pelo menu lateral.

---

## Requisitos Não-Funcionais

### RNF01 — Desempenho
- As respostas da API para listagens e dashboard devem ser retornadas em menos de 500ms para volumes de até 100 dicionários e 10.000 campos.
- O score de cada campo deve ser calculado dinamicamente (sem tabela de cache), aceitável para o volume esperado nesta fase.

### RNF02 — Usabilidade
- A interface deve ser compreensível por usuários sem conhecimento técnico em TI.
- Todos os textos da interface devem estar em português brasileiro.
- O sistema de pontuação e classificação deve ser visualmente claro com uso de cores e ícones padronizados.

### RNF03 — Manutenibilidade
- O contrato da API deve ser definido em OpenAPI 3 e os hooks/schemas devem ser gerados por codegen (Orval) — não escritos manualmente.
- O schema do banco de dados deve ser gerenciado exclusivamente via Drizzle ORM.
- Logs de servidor devem usar o logger estruturado (`req.log` / `logger`) — nenhum `console.log` em código de servidor.

### RNF04 — Portabilidade
- O projeto deve funcionar como monorepo pnpm e ser executável em qualquer ambiente com Node.js ≥ 20 e PostgreSQL.
- As variáveis de ambiente sensíveis (`DATABASE_URL`, `SESSION_SECRET`) não devem ser commitadas no repositório.

### RNF05 — Segurança (v1)
- Nenhuma informação sensível de paciente deve ser armazenada — o sistema lida apenas com metadados de campos de sistemas.
- A variável `SESSION_SECRET` deve ser configurada via variável de ambiente, nunca hardcoded.

### RNF06 — Extensibilidade
- O schema do banco já prevê colunas `version` e `parentId` em dicionários para suporte futuro a versionamento.
- A arquitetura deve suportar a adição de autenticação por perfil em versões futuras sem reescrita significativa.

---

## Fora do Escopo (v1)

- Autenticação e controle de acesso por perfil de usuário
- Versionamento de dicionários com diff entre versões
- Notificações e fluxo de aprovação formal (workflow de aprovação)
- Integração direta com sistemas de procurement / ERPs hospitalares
- Suporte a múltiplos idiomas

---

## Entregáveis

| Entregável | Descrição |
|---|---|
| Dicionário validado (JSON) | Exportação completa com campos e histórico de validações |
| Dicionário validado (CSV) | Exportação tabular para uso em planilhas e relatórios |
| Dicionário validado (DDL) | Script `CREATE TABLE` pronto para uso em modelagem de banco de dados |
| Dicionário validado (Data Contract) | Contrato de dados em JSON estruturado para times de engenharia |
| Dashboard de governança | Métricas consolidadas para auditoria e acompanhamento |
| Relatório de campos críticos | Lista de campos que exigem atenção imediata |
