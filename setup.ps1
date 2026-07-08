Write-Host 'Iniciando setup do Validador de Dicionário de Dados'

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  Write-Error 'Corepack não foi encontrado. Instale Node.js 20+ e execute novamente.'
  exit 1
}

Write-Host 'Habilitando Corepack...'
corepack enable

Write-Host 'Instalando dependências com pnpm...'
corepack pnpm install

Write-Host 'Ativando hooks do Git...'
corepack pnpm exec husky install

Write-Host 'Setup concluído. Para iniciar o projeto, execute:'
Write-Host '  pnpm run dev'
