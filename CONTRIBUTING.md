# Contribuição

Obrigado por contribuir para o Validador de Dicionário de Dados.

## Passo a passo para contribuir

1. Clone o repositório e mude para o diretório do projeto:

```bash
git clone https://github.com/<seu-usuario>/validador-dd.git
cd validador-dd
```

2. Instale as dependências e configure os hooks de commit:

No Windows:

```powershell
.\setup.ps1
```

No Linux/macOS:

```bash
corepack enable
pnpm install
```

3. Crie uma branch de trabalho:

```bash
git checkout -b feature/nome-da-sua-melhoria
```

4. Faça suas alterações.

5. Antes de commitar, use o `prettier` e o `typecheck`:

```bash
pnpm run format
pnpm run typecheck
```

6. Commita com uma mensagem clara:

```bash
git add .
git commit -m "feat: descrição curta do que foi feito"
```

7. Envie a branch para o GitHub:

```bash
git push origin feature/nome-da-sua-melhoria
```

8. Abra um Pull Request no GitHub.

## Validações automáticas

As seguintes validações rodam automaticamente no GitHub Actions para PRs:

- instalação de dependências com `pnpm`
- `pnpm run typecheck`
- `pnpm run build`

No seu computador, o hook pre-commit executa:

- formatação automática com `prettier` em arquivos modificados

## Padrões de branch

- `main`: código liberado em produção
- `feature/*`: novas funcionalidades e melhorias
- `hotfix/*`: correções urgentes

## Observações

- Use `pnpm` sempre que possível.
- Se precisar de ajuda, descreva o problema no PR ou abra uma issue.
