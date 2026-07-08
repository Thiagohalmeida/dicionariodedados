# Instruções de colaboração entre duas máquinas

Este projeto é um monorepo com múltiplos pacotes e um fluxo de trabalho baseado em Git. Para trabalhar em conjunto com outra máquina sem gerar conflitos, o ideal é dividir o trabalho por frente e manter cada máquina em sua própria branch.

## Regras de ouro

- Nunca trabalhar diretamente em `main`.
- Cada máquina deve ter sua própria branch de desenvolvimento.
- Cada branch deve concentrar uma frente bem definida.
- Arquivos compartilhados, como `package.json` (root), `pnpm-workspace.yaml`, `tsconfig*.json`, `tsconfig.base.json`, `.npmrc`, `README.md`, `CONTRIBUTING.md` e documentos em `docs/`, precisam de coordenação prévia.
- **Pacotes compartilhados em `lib/` são áreas de alto conflito** — qualquer alteração neles afeta ambas as frentes e deve ser comunicada antes.
- Antes de começar, sempre atualizar a base local com `main`.
- Commits pequenos e frequentes são preferíveis a grandes alterações.

## Divisão sugerida de frentes

Exemplos de divisão:

- **Máquina A — Backend/API + Banco**
  - diretórios principais: `artifacts/api-server/`, `lib/db/`
  - responsabilidade: API server, schema do banco, migrations, validações server-side

- **Máquina B — Frontend (Data Dictionary + Mockup Sandbox)**
  - diretórios principais: `artifacts/data-dict/`, `artifacts/mockup-sandbox/`
  - responsabilidade: UI do validador de dicionário, sandbox de componentes, páginas, hooks, estilos

- **Áreas compartilhadas — Coordenar sempre antes de alterar**
  - `lib/api-client-react/` — cliente React para a API (usado pelos frontends)
  - `lib/api-spec/` — especificação OpenAPI/contratos (fonte de verdade para ambos)
  - `lib/api-zod/` — schemas Zod compartilhados (validação client + server)
  - `lib/integrations/` — integrações terceiras compartilhadas
  - `lib/db/src/schema/` — schemas Drizzle (tipos TypeScript exportados para frontends)
  - Configs raiz: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsconfig.base.json`, `.npmrc`

- **Documentação e setup** — `docs/`, `README.md`, `CONTRIBUTING.md`, `setup.ps1`, `sync.ps1` (coordenar)

Se uma máquina precisar tocar em arquivos que a outra já está editando, isso deve ser discutido antes para evitar sobrescrita.

## Fluxo recomendado para cada máquina

1) Verificar o estado local

```powershell
git status
git stash push -m "wip-before-sync"   # somente se houver alterações locais não commitadas
```

2) Atualizar a base a partir de `main`

```powershell
git fetch origin
git switch main
git pull --rebase origin main
```

3) Criar uma branch específica para a frente

```powershell
git switch -c feature/<seu-nome>/<frente> origin/main
```

Exemplos:

```powershell
git switch -c feature/thiago/backend origin/main
git switch -c feature/ana/frontend origin/main
```

4) Trabalhar somente na frente definida

- Evitar modificar arquivos de outra frente sem necessidade.
- Se for preciso alterar um arquivo compartilhado, comunicar antes e manter a mudança mínima.

5) Sincronizar com frequência

```powershell
git fetch origin
git rebase origin/main
```

Se houver mudanças da outra máquina no remoto e elas não forem conflitantes, o rebase mantém o histórico limpo.

6) Enviar a branch para o repositório remoto

```powershell
git push -u origin feature/<seu-nome>/<frente>
```

## Validação antes de fechar a frente

Este projeto usa `pnpm` e scripts no root. Antes de abrir revisão ou merge, validar localmente:

```powershell
corepack enable
pnpm install
pnpm run typecheck
pnpm run build
```

Se houver erro, corrigir antes de enviar a branch.

## Regras para evitar conflitos

- Não editar o mesmo arquivo sem comunicação prévia.
- Se o trabalho for em áreas diferentes, o risco de conflito cai bastante.
- Se houver necessidade de alterar algo em comum, fazer isso em uma única máquina primeiro e depois integrar com a outra.
- Se surgirem conflitos de merge ou rebase, resolver imediatamente e não deixar para depois.

## Processo de integração

Quando uma frente estiver pronta:

1. Fazer push da branch.
2. Abrir um Pull Request para `main`.
3. Validar novamente no CI/localmente.
4. Fazer merge somente após revisão.
5. Em cada máquina, atualizar `main` novamente.

```powershell
git switch main
git pull --rebase origin main
```

## Opcional: usar `sync.ps1` como helper

O script `sync.ps1` pode ser usado para atualizar a máquina local antes de começar uma nova frente, mas ele não substitui a organização por branch e por responsabilidade de arquivos.

```powershell
.\sync.ps1 main
```

Resumo prático: uma máquina cuida do backend, a outra cuida do frontend, ambas partem de `main`, trabalham em branches separadas e só integram quando a validação estiver verde.
