param(
  [Parameter(Mandatory = $true)]
  [string]$Bucket,

  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
)

$ErrorActionPreference = 'Stop'

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.jpg'  { 'image/jpeg'; break }
    '.jpeg' { 'image/jpeg'; break }
    '.png'  { 'image/png'; break }
    '.gif'  { 'image/gif'; break }
    '.webp' { 'image/webp'; break }
    '.svg'  { 'image/svg+xml'; break }
    default { 'application/octet-stream' }
  }
}

$pastas = @(
  (Join-Path $RepoRoot 'public\imagens\uploads'),
  (Join-Path $RepoRoot 'uploads')
) | Where-Object { Test-Path $_ }

$enviados = @{}

foreach ($pasta in $pastas) {
  Get-ChildItem -Path $pasta -File | ForEach-Object {
    if ($enviados.ContainsKey($_.Name)) { return }
    $enviados[$_.Name] = $true

    $contentType = Get-ContentType $_.FullName
    $objectPath = "$Bucket/$($_.Name)"
    Write-Host "Enviando $($_.Name) para R2..." -ForegroundColor Cyan
    npx wrangler r2 object put $objectPath --file $_.FullName --content-type $contentType --force
  }
}

Write-Host "Uploads enviados para R2." -ForegroundColor Green
