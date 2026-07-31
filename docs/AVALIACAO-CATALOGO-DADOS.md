# Avaliação: Aba de Catálogo de Dados (Suprimentos) — Faz Sentido?

## Veredito

**Sim, faz sentido — e complementa bem a plataforma que já existe**, desde que seja tratada como um
módulo **separado** (dados de referência, somente leitura) e não misturada com as tabelas de
`dictionaries`/`fields`/`validations` que já existem (que são sobre dicionários **novos em validação**,
um domínio de dados diferente).

O ganho real que você descreveu é genuíno: hoje esse conhecimento está preso em um PDF de 153 páginas
que ninguém vai ler linha a linha. Colocar isso pesquisável, na mesma plataforma onde os compradores já
trabalham, resolve um problema real de "conhecimento tribal" e cria exatamente o elo que você quer —
comprador confirmar que o campo X da planilha dele é a mesma coisa que o campo Y do catálogo SAP.

---

## O que eu confirmei no PDF (abri e extraí de verdade, não só validei o plano)

- **153 páginas, texto nativo** (gerado pelo Oracle Analytics Publisher) — **não é scan**, não precisa de
  OCR. Fontes embutidas, extração de texto limpa.
- **Contagem real:** 9 tabelas RFN + 9 tabelas RAW = 18 tabelas, **674 atributos de coluna** (bate com a
  sua estimativa de "9-12 RFN / 8-10 RAW / centenas de colunas"), 24 indicadores, 22 requisitos de
  negócio.
- **O layout é muito consistente** — cada coluna de cada tabela segue exatamente o mesmo template
  (`Coluna | Tipo Dado | Descrição da Coluna`, seguido de `° Chave Primária ou única / Obrigatório /
  Informação confidencial / Classificação dado pessoal / Informação identificável`). Isso é ótima notícia:
  dá para escrever um parser de texto (regex/state machine) confiável, sem precisar de OCR nem de
  heurísticas frágeis de layout.

## O que o plano original não pegou (e precisa ajustar)

### 1. Nomes de coluna longos quebram em duas linhas no texto extraído
Confirmei isso na prática: `SK_SUP_DOCUMENTO_COMPRA_MATERI` aparece numa linha e `AL_CENTRO` na linha
seguinte, como continuação do mesmo nome de coluna. Um parser ingênuo (linha por linha) vai gerar duas
colunas fantasma em vez de uma. **O parser precisa detectar continuação de linha** (linha seguinte sem os
marcadores `°`/`Coluna`/tipo de dado reconhecível = é continuação da linha anterior).

### 2. "Lineage" (origem → destino) NÃO existe como seção estruturada no PDF
O exemplo que você deu (`"linhagem": {"sap": ["ME2N", "ME3M", ...]}`) é desejável, mas **não está pronto
para extração automática 1:1**. O que existe de fato:
- Cada tabela RFN/RAW tem uma lista de **nomes de pacotes de ETL** (`Engenharia de dados (ELT):
  pkg_rfn_msh_sap_sup_contratualizacao`, etc.) — isso é limpo e extraível, mas é só "quais pacotes tocam
  essa tabela", não "de onde vêm os dados, coluna a coluna".
- As relações origem → destino (ex.: "a tabela de Material tem origem em RAW_SAP_MARA, RAW_SAP_MAKT...")
  aparecem em **texto livre**, dentro da seção de "Requisitos do assunto" — não em campos estruturados.
  Dá para extrair com regex/heurística (ex.: procurar por `RAWZN.RAW_SAP_\w+` mencionados perto de um nome
  de tabela RFN), mas é **best-effort**, vai precisar de revisão humana pontual, não é um grafo 100%
  confiável direto do PDF.
- **Recomendação:** trate o lineage como um **enriquecimento de segunda fase**, feito por revisão manual
  ou heurística com correção humana — não prometa isso como saída automática confiável da primeira
  versão.

### 3. Estimativa de tamanho do JSON parece superestimada
5–20 MB é grande demais para ~674 colunas + 24 indicadores + 22 requisitos com os campos que você
listou. Uma estrutura bem normalizada (a que está no seu exemplo) deve ficar na faixa de **algumas
centenas de KB a 1–2 MB**. Só chegaria a 5–20 MB se você embutir o texto narrativo completo de cada
requisito verbatim em vez de resumi-lo — o que também não seria uma boa prática para um catálogo
pesquisável (melhor indexar o texto para busca do que duplicá-lo em cada nó do JSON).

### 4. JSON solto (arquivo estático) não é a melhor forma de "servir" isso numa aba da plataforma
Seu instinto de estrutura semântica está certo, mas o destino final não deveria ser "gerar um arquivo
JSON e pronto" — deveria ser **carregar esse JSON no banco (o mesmo Postgres/Supabase que a plataforma já
usa)**, em tabelas próprias, para dar busca rápida, filtro e a tela de "digitar um campo e ver onde ele
aparece" que você descreveu. O JSON é uma etapa intermediária do pipeline de importação, não o produto
final.

---

## Arquitetura recomendada (dentro do projeto que já existe)

### Por que não misturar com `dictionaries`/`fields`
As tabelas atuais (`dictionaries`, `fields`, `validations`) representam dicionários **novos, em processo
de validação** pelos compradores — um fluxo de trabalho ativo. O catálogo SAP é **dado de referência,
somente leitura**, de um domínio diferente (o que já existe em produção, não o que está sendo proposto).
Misturar os dois no mesmo schema geraria confusão semântica (um campo "aprovado" nesse catálogo não
significa a mesma coisa que um campo "aprovado" num dicionário novo).

### Tabelas novas sugeridas (mesmo Postgres, schema separado ou prefixo `catalog_`)
```
catalog_domains        (assunto, owner, área de negócio, palavras-chave)
catalog_tables         (schema, nome, descrição, camada RFN/RAW, data owner)
catalog_columns        (tabela_id FK, nome, tipo, descrição, pk, obrigatório,
                         confidencialidade, classificação_lgpd, identificável)
catalog_indicators      (nome, memória_cálculo, especificação, frequência, homologadores)
catalog_requirements    (assunto, descrição, regras_negócio, status, data_levantamento)
catalog_etl_packages    (nome do pacote)
catalog_table_etl       (tabela_id FK, etl_package_id FK — relação N:N)
```

### O elo que você pediu (comprador referenciar campo da planilha ↔ campo do catálogo)
Adicionar uma coluna nullable em `fields` (a tabela que já existe):
```
catalog_column_id  →  FK opcional para catalog_columns.id
```
Isso permite exatamente o fluxo que você descreveu: ao validar um campo de uma planilha nova, o comprador
pode buscar no catálogo e "linkar" o campo dele ao item correspondente já catalogado — sem misturar os
dois modelos de dados.

### Backend
Novo grupo de rotas, ex.: `GET /api/catalog/search?q=...` (busca por nome de tabela, nome de coluna ou
trecho da descrição), `GET /api/catalog/tables/:id` (detalhe com colunas). Reaproveita a mesma stack
(Express + Drizzle) já usada no resto do `api-server`.

### Frontend
Uma aba nova e independente ("Catálogo de Dados"), com um campo de busca central — exatamente o "digitar
uma informação/campo e a ferramenta mostra os dados disponíveis" que você descreveu — retornando tabela,
schema, tipo, descrição, classificação LGPD e, se aplicável, os campos de dicionários já vinculados a
ele.

### Importação (não é um "scraper" recorrente — é um script de carga pontual)
Um script único (mesmo padrão do `scripts/src/seed.ts` que já existe no projeto): lê o PDF, faz o parsing
em texto estruturado, e faz **upsert** nas tabelas acima usando uma chave natural
(`schema + nome_tabela` para tabelas, `tabela_id + nome_coluna` para colunas). Isso é importante porque
esse catálogo SAP não é estático — quando surgir uma nova exportação do Oracle Analytics Publisher no
futuro, você roda o mesmo script de novo e ele atualiza sem duplicar.

---

## O que eu **não** faria agora

- **DataHub / Purview / Neo4j** — são destinos válidos no longo prazo (você mesmo citou), mas são uma
  segunda fase, não o MVP. Uma vez que os dados estejam estruturados no Postgres (que já é o banco da
  plataforma), exportar para essas ferramentas depois é trivial — não vale complicar a primeira entrega
  com isso.
- **Lineage automático 100% confiável** — como mostrado acima, o PDF não sustenta isso sem revisão
  humana. Prometer isso na v1 gera expectativa que o dado-fonte não cobre.

---

## Plano de implementação sugerido (fases)

| Fase | O que fazer |
|---|---|
| 1 | Escrever o parser (Python ou Node) sobre o texto extraído do PDF (`pdftotext -layout`), tratando a quebra de linha de nomes longos (achado #1 acima). Gerar o JSON intermediário só para validação manual — não é o produto final. |
| 2 | Criar as tabelas `catalog_*` no schema Drizzle (`lib/db/src/schema/catalog.ts`), migrar, e escrever o script de importação (upsert) que lê o JSON intermediário e popula o banco. |
| 3 | Endpoint de busca (`/api/catalog/search`) + tela de busca no frontend, como aba nova. |
| 4 | Campo `catalog_column_id` em `fields`, com UI de "vincular ao catálogo" na tela de validação existente. |
| 5 (opcional, depois) | Extração best-effort de lineage a partir do texto livre dos requisitos, com revisão humana antes de confiar nela. |

Se fizer sentido, no próximo passo posso ajudar a escrever o parser de verdade (já testei que o texto
extrai limpo e o padrão é consistente o suficiente para isso funcionar bem).
