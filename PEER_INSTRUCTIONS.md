# Instruções para o desenvolvedor na máquina principal (main)

Este arquivo explica como revisar e testar com segurança as mudanças na branch `feature/thiago-setup` antes de aceitar qualquer merge em `main`.

1) Buscar a branch remota e criar uma branch de inspeção local

```bash
# garantir repositório limpo (commit ou stash se necessário)
git status
git stash push -m "pre-inspect-sync"    # opcional se houver trabalho não commitado

# buscar a branch publicada
git fetch origin

# criar branch de inspeção a partir da branch remota
git checkout -b feature/inspect-sync origin/feature/thiago-setup
```

2) Revisar o novo arquivo `sync.ps1` (e outros arquivos adicionados)

```bash
# abra no editor (VS Code exemplo)
code sync.ps1
# ou apenas visualizar
sed -n '1,200p' sync.ps1
```

3) Testar os passos manualmente (recomendado) em vez de executar o script diretamente

```bash
# verifique main está atualizado e limpo
git checkout main
git fetch origin
git pull --rebase origin main

# instalar dependências (no ambiente local ou container)
corepack enable
pnpm install

# rodar validações
pnpm run typecheck
pnpm run build
```

4) Opcional: executar `sync.ps1` somente se tudo acima estiver correto

```powershell
# No Windows (após inspeção e stash/commit das suas mudanças locais)
.\sync.ps1 main
```

5) Revisão e merge

- Abra um Pull Request de `feature/thiago-setup` → `main` (link rápido: https://github.com/Thiagohalmeida/dicionariodedados/compare/main...feature/thiago-setup?expand=1)
- Aguarde CI finalizar (`typecheck` + `build`) e valide manualmente localmente.
- Se tudo OK, aprove e faça merge.

6) Depois do merge, na sua máquina principal atualize `main`:

```bash
git checkout main
git fetch origin
git pull --rebase origin main
```

---

Se quiser, atualizo este arquivo com instruções específicas do ambiente da outra máquina (ex.: usar Docker, container VS Code ou caminhos Windows específicos).