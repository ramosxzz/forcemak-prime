param(
  [Parameter(Mandatory = $true)]
  [string]$NamespaceId,

  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
)

$ErrorActionPreference = 'Stop'

$dadosDir = Join-Path $RepoRoot 'dados'
if (-not (Test-Path $dadosDir)) {
  throw "Pasta de dados não encontrada: $dadosDir"
}

$arquivos = @(
  'conteudo.json',
  'produtos.json',
  'usuarios.json',
  'contatos.json'
)

foreach ($arquivo in $arquivos) {
  $caminho = Join-Path $dadosDir $arquivo
  if (-not (Test-Path $caminho)) {
    Write-Warning "Ignorando arquivo ausente: $arquivo"
    continue
  }

  Write-Host "Enviando $arquivo para KV..." -ForegroundColor Cyan
  npx wrangler kv key put $arquivo --path $caminho --namespace-id $NamespaceId
}

Write-Host "Dados enviados para KV." -ForegroundColor Green
