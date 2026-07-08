param(
  [string]$Branch = ''
)

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  Write-Error 'Corepack não foi encontrado. Instale Node.js 20+ e execute novamente.'
  exit 1
}

Write-Host 'Sincronizando repositório...'

corepack enable

if (-not (Test-Path '.git')) {
  Write-Error 'Este script deve ser executado na raiz do repositório.'
  exit 1
}

if ($Branch -ne '') {
  git checkout $Branch
} else {
  $Branch = git branch --show-current
}

git fetch origin

git pull --rebase origin $Branch

Write-Host 'Instalando dependências...'
corepack pnpm install

Write-Host 'Sincronização concluída. Para validar, execute:'
Write-Host '  pnpm run typecheck'
Write-Host '  pnpm run build'