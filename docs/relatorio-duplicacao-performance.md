# Relatório Técnico — Duplicação de Código (DRY) e Performance
**Projeto:** dicionariodedados-main (app "Validador de Dados" / Pulso)
**App analisado:** `artifacts/data-dict` (frontend React + Vite + TS, é o app referenciado por `dev:web` no `package.json` raiz)
**Escopo:** apenas o código realmente presente no repositório enviado. Nada abaixo foi inferido sem uma linha de código correspondente.

---

## 1. Resumo Executivo

| Categoria | Itens encontrados |
|---|---|
| Duplicação de componentes inteiros (DRY) | 2 componentes praticamente idênticos (~250 linhas cada) duplicados em 2 arquivos |
| Duplicação de funções utilitárias | 2 conjuntos de funções de tradução/cor duplicados |
| Duplicação de padrão de paginação | 2 páginas com a mesma lógica de paginação copiada |
| Duplicação de padrão fetch+toast+loading | Repetido em 3 arquivos, ~8 ocorrências | 
| `React.memo()` em uso | **0 ocorrências** em todo o app |
| `useMemo()` em uso | **0 ocorrências** em todo o app |
| `useCallback()` em uso | 4 ocorrências, concentradas em **1 arquivo** (`preview-validation-sheet.tsx`) |
| Virtualização de listas | **Não implementada** em nenhuma tabela |
| Imagens não otimizadas | Não encontrado problema real (ver seção 3.5) |
| Scraping no projeto | **Não existe** nenhum código de web scraping no repositório (ver seção 4) |

---

## 2. Duplicação de Código (Princípio DRY)

### 2.1 `EditFieldDialog` duplicado integralmente
- **Arquivo A:** `src/pages/dictionary-detail.tsx` (linhas 335–472)
- **Arquivo B:** `src/components/preview-validation-sheet.tsx` (linhas 91–218)

Os dois componentes são quase idênticos: mesmo estado de formulário (`campoOrigem`, `descricao`, `origem`, `periodicidade`, `campoTecnico`, `tipoDado`, `chave`), mesmo JSX de grid 2 colunas com `Input`/`Select`, mesmo `DialogFooter` com "Cancelar"/"Salvar Alterações". A única diferença real é que a versão do preview tem um campo extra (`included`) e chama `onSave` local em vez de uma mutation de API.

**Refatoração sugerida:**
Extrair um componente compartilhado `EditFieldDialog` em `src/components/shared/edit-field-dialog.tsx`, recebendo:
```ts
interface EditFieldDialogProps {
  field: { campoOrigem, descricao, origem, periodicidade, campoTecnico, tipoDado, chave, included? };
  onClose: () => void;
  onSave: (data) => void; // cada tela decide se isso dispara mutation ou apenas atualiza estado local
  showIncludedField?: boolean; // controla o campo extra do preview
}
```
Isso elimina ~120 linhas duplicadas e centraliza qualquer correção futura (ex.: adicionar validação de campo obrigatório) em um único lugar.

### 2.2 `ValidationPanel` duplicado quase integralmente
- **Arquivo A:** `src/pages/dictionary-detail.tsx` (linhas 474–846), ~370 linhas
- **Arquivo B:** `src/components/preview-validation-sheet.tsx` (linhas 220–538), ~318 linhas

Ambos têm:
- A mesma lista estática `validatorOptions` com 9 nomes (`"Cleber Horta", "Fernando Rosseto", ...`) **copiada literalmente duas vezes**.
- O mesmo objeto de formulário (`validatorName, used, required, correctName, correctOrigin, hasBusinessRule, originType, originDetail, businessRuleRationale, formula, comment`).
- A mesma lógica de validação em `handleSubmit` (nome obrigatório, tipo de origem obrigatório, racional obrigatório se `hasBusinessRule`).
- O mesmo bloco de 5 critérios de validação (checkboxes) com o mesmo texto em português.
- O mesmo bloco condicional de "Campo Fórmula" (`nao`/`sim`/`suporte`) com o mesmo texto explicativo.

A diferença real está apenas na camada de persistência: a versão de `dictionary-detail.tsx` chama `useSubmitValidation()` e `useUpdateField()` (mutations reais da API), enquanto a versão do preview apenas chama `onSave(validationData)` para atualizar o estado local antes da importação.

**Refatoração sugerida:**
1. Mover `validatorOptions` para uma constante única, ex. `src/lib/constants.ts`:
   ```ts
   export const VALIDATOR_OPTIONS = [
     "Cleber Horta", "Fernando Rosseto", "Lucas Silva", "Rosangela Goncalves",
     "Alexandra Joelma", "Tania Ribeiro", "Ricardo Paulino", "Eduardo Lefundes",
     "Thiago Almeida",
   ] as const;
   ```
2. Extrair um hook `useValidationForm(initial)` que encapsula o estado do formulário e a função `handleSubmit` (validações + montagem do payload), retornando `{ form, setForm, handleSubmit }`. A tela chamadora passa apenas uma função `onValid(payload)` que decide o que fazer (mutation de API vs. estado local).
3. Extrair um componente puramente apresentacional `ValidationFormFields` com todo o JSX dos critérios de validação (que é 100% idêntico nas duas telas), recebendo `form` e `setForm` como props.

Isso reduziria os dois arquivos combinados de ~690 linhas de formulário duplicado para um hook + um componente compartilhado de ~150–200 linhas, usados nos dois lugares.

### 2.3 Funções de tradução/cor de status duplicadas
- **Fonte "oficial":** `src/lib/utils.ts` — `traduzirStatus()` (linha 16) e `traduzirClassificacao()` (linha 28).
- **Duplicata local:** `src/components/preview-validation-sheet.tsx` (linhas 540–575) reimplementa o mesmo conceito com nomes diferentes: `getClassificationColor()`, `getStatusColor()`, `translateStatus()`, `translateClassification()`.

As tabelas de tradução (`pending → "Pendente"`, `reliable → "Confiável"`, etc.) são copiadas manualmente, criando risco real de divergência: se amanhã alguém adicionar um novo status em `lib/utils.ts`, o preview continuará mostrando o texto em inglês/bruto para esse status.

**Refatoração sugerida:** apagar as 4 funções locais do `preview-validation-sheet.tsx` e importar `traduzirStatus`/`traduzirClassificacao` de `@/lib/utils`. Para as cores de badge (`getStatusColor`/`getClassificationColor`), que não existem em `lib/utils.ts`, criar lá as versões oficiais (`statusBadgeVariant()`, `classificationBadgeVariant()`) e reutilizar também em `dictionary-detail.tsx`, que hoje calcula a cor inline com um `? :` encadeado (linhas 257–284).

### 2.4 Bloco de paginação duplicado
- **Arquivo A:** `src/pages/dictionaries.tsx` (linhas 260–288)
- **Arquivo B:** `src/pages/critical-fields.tsx` (linhas 107–135)

Os dois arquivos repetem, literalmente:
- `const LIMIT = 20;`
- `const [page, setPage] = useState(1);`
- `canPrev = page > 1`, `canNext = page < totalPages`
- O mesmo texto `"Exibindo X–Y de Z"` / `"Nenhum ... encontrado"`
- Os mesmos dois botões "Anterior"/"Próxima" com `Math.max(1, p-1)` / `Math.min(totalPages, p+1)`

**Refatoração sugerida:** criar um hook `usePagination(initialLimit = 20)` retornando `{ page, setPage, canPrev, canNext, goPrev, goNext }`, e um componente `<PaginationFooter total={} page={} totalPages={} limit={} onPrev={} onNext={} itemLabel="dicionário" />`. Isso elimina a duplicação e garante que qualquer terceira lista paginada no futuro (ex. se `preview-validation-sheet.tsx` ganhar paginação — ver seção 3.4) já nasça consistente.

### 2.5 Padrão "fetch manual + toast de erro + loading state" repetido
Encontrado em pelo menos 8 funções distintas, em 3 arquivos:
- `src/pages/dictionary-detail.tsx`: `handleExport`, `handleExportExtra`
- `src/pages/new-dictionary.tsx`: `handlePreview` (dentro de `ExcelImportTab`)
- `src/pages/supabase-config.tsx`: `loadConfig`, `checkStatus`, `handleSave`, `handleCreateBuckets`

Todas seguem exatamente o mesmo esqueleto:
```ts
setLoadingFlag(true);
try {
  const res = await fetch(`${getApiBase()}/api/...`);
  if (!res.ok) throw new Error();
  const data = await res.json();
  // sucesso: toast({ title, description })
} catch {
  toast({ title: "Erro ao ...", description: "...", variant: "destructive" });
} finally {
  setLoadingFlag(false);
}
```
Esse padrão já existe na base via `@tanstack/react-query` (usado em outras telas), mas essas chamadas específicas usam `fetch` cru porque não passam pelos hooks gerados (`@workspace/api-client-react`) — provavelmente por serem endpoints de exportação/config ainda não modelados no `orval`/OpenAPI.

**Refatoração sugerida:** criar um utilitário único `apiRequest<T>(path, options)` em `src/lib/api-request.ts` que padroniza a URL base (`getApiBase()`), o tratamento de erro HTTP e o parse de JSON, e um hook `useApiAction()` que encapsula `loading`/`try/catch/toast/finally` recebendo apenas a função a executar e as mensagens de sucesso/erro. Isso reduz o boilerplate repetido de ~15 linhas por chamada para 3–4 linhas.

---

## 3. Performance e Otimização

### 3.1 Componentes que poderiam usar `React.memo()`
**Situação atual:** nenhuma ocorrência de `React.memo` em todo o código de `artifacts/data-dict/src` (fora da pasta `components/ui`, que é a biblioteca shadcn e não deve ser tocada).

**Onde faria diferença real:**
- As linhas de tabela (`<TableRow>`) dentro de:
  - `dictionary-detail.tsx` (linhas 234–310) — uma linha por campo do dicionário.
  - `dictionaries.tsx` (linhas 196–248) — uma linha por dicionário.
  - `critical-fields.tsx` (linhas 65–95) — uma linha por campo crítico.
  - `preview-validation-sheet.tsx` (linhas 740–814) — uma linha por campo do Excel importado.

Hoje essas linhas são JSX inline dentro do `.map()`, então não há como memoizá-las isoladamente. **Impacto real:** ao abrir `selectedField`/`editingField` (que dispara `setState` em `dictionary-detail.tsx`), o componente pai inteiro re-renderiza, e o React precisa reconciliar **todas** as linhas da tabela de novo, mesmo que apenas o Sheet/Dialog lateral tenha mudado.

**Sugestão concreta:** extrair `<TableRow>` de cada tabela para um componente próprio (`FieldTableRow`, `DictionaryTableRow`, `CriticalFieldRow`, `PreviewFieldRow`) envolvido em `React.memo()`, recebendo apenas os dados do item e callbacks estáveis (ver 3.2). Com listas de até ~20 itens (o limite de paginação atual) o ganho é pequeno, mas em `dictionary-detail.tsx` — que **não pagina os campos do dicionário** — um dicionário com 100+ campos vai reconciliar 100+ linhas a cada clique em "Validar"/"Editar", sem necessidade.

### 3.2 Funções recriadas a cada render (`useCallback`)
**Situação atual:** `useCallback` só é usado em `preview-validation-sheet.tsx` (linhas 601, 611, 623, 629). Em todos os outros arquivos, os handlers passados para `onClick`/`onChange` são funções inline recriadas a cada render:

- `dictionary-detail.tsx`: `onClick={() => setSelectedField(field)}`, `onClick={() => setEditingField(field)}`, `onClick={(e) => e.stopPropagation()}` — recriadas para cada uma das N linhas a cada render da página.
- `dictionaries.tsx`: `onClick={() => openEdit(dict as DictItem)}`, `onClick={() => setDeleteTarget(dict as DictItem)}`.
- `critical-fields.tsx`: os `onClick`/`Link href` são estáticos por item, então o impacto aqui é baixo.

**Impacto real:** enquanto as linhas de tabela não forem memoizadas (item 3.1), criar `useCallback` para esses handlers **não traz ganho isolado** — o React ainda vai re-renderizar a linha porque o componente pai renderiza tudo de novo. Por isso a ordem correta de aplicar a otimização é:
1. Primeiro extrair as linhas para componentes com `React.memo` (3.1).
2. Só então envolver os handlers que essas linhas recebem em `useCallback` (com dependências corretas, ex. `[field.id]`), para que a comparação por referência do `memo` realmente evite o re-render.

Fazer só o `useCallback` sem o `memo` correspondente não melhora nada — por isso vale registrar a dependência entre os dois itens.

### 3.3 Cálculos que poderiam usar `useMemo`
**Situação atual:** nenhuma ocorrência de `useMemo` no código.

**Candidatos encontrados (impacto real, mas baixo/moderado dado o volume de dados atual):**
- `dictionaries.tsx`, linha 197–200: `progress = (dict.approvedFields / dict.totalFields) * 100` é recalculado dentro do `.map()` a cada render. É um cálculo trivial (uma divisão), então o ganho de `useMemo` aqui seria insignificante — citado apenas para registro, **não é prioridade**.
- `dashboard.tsx`, linhas 110–114: mesmo cálculo de progresso, mesmo caso — baixa prioridade.
- **Caso que realmente importa:** o array `validatorOptions` (9 strings) é recriado como literal **dentro do corpo do componente** `ValidationPanel`, tanto em `dictionary-detail.tsx` (linha 488) quanto em `preview-validation-sheet.tsx` (linha 244–254), a cada render do painel de validação. Como é uma constante estática, não deveria estar dentro do componente — a correção correta aqui não é `useMemo`, e sim **mover a constante para fora do componente** (ou para `src/lib/constants.ts`, reforçando a sugestão da seção 2.2), eliminando a realocação de array a cada render sem custo de dependência.

### 3.4 Listas grandes sem virtualização
**Situação atual:** nenhuma biblioteca de virtualização (`react-window`, `react-virtual`, `@tanstack/react-virtual`) está presente no `package.json` do app nem é usada no código.

- `dictionaries.tsx` e `critical-fields.tsx` já limitam a 20 itens por página (`LIMIT = 20`), então a ausência de virtualização aqui **não é um problema real** — 20 linhas de tabela é um volume trivial para o DOM.
- **O ponto que merece atenção de verdade:** a tabela de campos em `dictionary-detail.tsx` (linha 234, `dict.fields.map(...)`) **não tem nenhuma paginação nem limite**. Se um dicionário tiver, por exemplo, 200+ campos (plausível para tabelas de sistemas legados/SAP mencionadas no `attached_assets`), a página vai montar 200+ `<TableRow>` complexas (cada uma com 2 badges calculadas e 2 botões) de uma vez.
- O mesmo vale para `preview-validation-sheet.tsx` (linha 740, `fields.map(...)`), que exibe **todas** as colunas detectadas na planilha Excel de uma vez, sem paginação — uma planilha com muitas colunas geraria uma tabela igualmente grande.

**Sugestão concreta:** para essas duas telas específicas, ou (a) aplicar a mesma paginação de 20 itens já usada em `dictionaries.tsx`/`critical-fields.tsx` (mais simples, e resolve também via componente compartilhado da seção 2.4), ou (b) se o requisito é ver tudo em uma tela só, trocar o `<TableBody>` por virtualização (`@tanstack/react-virtual`, que já convive bem com `@tanstack/react-query` presente no projeto).

### 3.5 Imagens não otimizadas
**Situação verificada:**
```
public/logo.png       243×46px, 8 KB
public/opengraph.jpg  1280×720px, 40 KB
public/favicon.svg    163 bytes
```
Usadas em apenas um lugar no código: `src/components/layout.tsx` linha 43 (`<img src="/logo.png" .../>`). O `opengraph.jpg` é referenciado apenas em metadados de compartilhamento (não em componentes React).

**Conclusão honesta:** não há problema real de imagens não otimizadas neste projeto — os dois arquivos já são pequenos (8 KB e 40 KB) e há apenas uma tag `<img>` em todo o app. Não faz sentido recomendar lazy-loading/compressão agressiva para um único logo de 8 KB — o ganho seria imperceptível. Único ajuste de baixíssimo custo, sem impacto de duplicação: adicionar `loading="lazy"` e `width`/`height` explícitos na tag `<img>` do logo para evitar leve *layout shift* no carregamento inicial do sidebar, mas isso é cosmético, não uma correção de performance real.

---

## 4. Scraping — verificação e observação honesta
Foi feita uma busca por `scrap` (case-insensitive) em todo o repositório (`.ts`, `.tsx`, `.md`) e **nenhum resultado foi encontrado**. Não existe nenhum módulo de web scraping no projeto.

O componente mais próximo, em espírito, é o **motor de ingestão de Excel** (`artifacts/api-server/src/modules/excel-ingestion-engine/index.ts`), que faz parsing/heurística de planilhas (não scraping web). Como o pedido menciona "melhores práticas para scraping", e não existe scraping de fato, seguem — com base no código real desse módulo, sem inventar contexto — pontos de performance genuínos identificados nele:

- `parseExcelToDataDictionary()` (linha 182) carrega o workbook inteiro em memória via `workbook.xlsx.load(buffer)` (ExcelJS "não-streaming"). Para arquivos grandes (o limite de upload no frontend já avisa "máx. 20 MB", em `new-dictionary.tsx` linha 479), isso pode ser substituído pelo modo *streaming* do ExcelJS (`ExcelJS.stream.xlsx.WorkbookReader`) para reduzir pico de memória no servidor.
- A planilha é percorrida **múltiplas vezes** de forma independente: uma vez em `scoreSheet()` para pontuar cada aba (linha 140, com dois `eachRow`/`eachCell` internos), outra vez em `sheet.eachRow` (linha 264) para montar `columnValues`, e mais uma vez implicitamente dentro de `detectPeriodicidade()` (linha 289) sobre `Object.values(columnValues).flat()`. Para planilhas com muitas linhas, isso significa 2–3 passes completos sobre os dados quando 1 pass (coletando os dados necessários para pontuação e tipo ao mesmo tempo) seria suficiente.
- `Object.values(columnValues).flat()` (linha 295) cria um array intermediário com **todas as células de todas as colunas válidas** apenas para checar a proporção de valores parecidos com data — para planilhas largas/longas esse é um alto custo de memória evitável (dá para acumular só os contadores necessários durante o loop de `eachRow` já existente).

Essas são otimizações de backend (Node/Excel), não de React — incluídas aqui apenas porque são o achado real mais próximo do termo "scraping" pedido, e porque de fato têm impacto de performance mensurável em arquivos maiores.

---

## 5. Priorização Sugerida

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 1 | Unificar `traduzirStatus`/`traduzirClassificacao` (2.3) | Baixo | Médio (evita bug de divergência) |
| 2 | Extrair hook + componente de `ValidationPanel` (2.2) | Médio-Alto | Alto (~690 linhas duplicadas) |
| 3 | Extrair `EditFieldDialog` compartilhado (2.1) | Médio | Alto |
| 4 | Hook `usePagination` + `PaginationFooter` (2.4) | Baixo | Médio |
| 5 | Utilitário `apiRequest`/`useApiAction` (2.5) | Médio | Médio |
| 6 | Paginar ou virtualizar tabela de campos em `dictionary-detail.tsx` e `preview-validation-sheet.tsx` (3.4) | Médio | Alto se dicionários tiverem muitos campos |
| 7 | Mover `validatorOptions` para constante de módulo (3.3) | Muito baixo | Baixo, mas fácil |
| 8 | `React.memo` nas linhas de tabela + `useCallback` nos handlers (3.1/3.2) | Médio | Depende do volume de itens por tela |
| 9 | Otimizações de streaming no `excel-ingestion-engine` (4) | Médio-Alto | Alto apenas para arquivos Excel grandes |
| 10 | `loading="lazy"` no logo (3.5) | Trivial | Insignificante |

---

*Relatório gerado a partir da leitura direta dos arquivos do projeto `dicionariodedados-main`, sem suposições sobre código não presente no repositório.*
