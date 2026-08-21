param()

$ErrorActionPreference = 'Stop'

$webRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $webRoot 'public\icons\pwa-icon.svg'
$outputDirectory = Join-Path $webRoot 'public\icons'
$magick = Get-Command magick -ErrorAction Stop

function Write-PwaIcon {
  param(
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][string]$OutputName,
    [switch]$OpaqueBackground
  )

  $outputPath = Join-Path $outputDirectory $OutputName
  $dimensions = "${Size}x${Size}"
  $background = if ($OpaqueBackground) { '#130f22' } else { 'none' }
  $arguments = @(
    '-background', $background,
    (Resolve-Path $sourcePath),
    '-resize', $dimensions,
    '-gravity', 'center',
    '-extent', $dimensions
  )

  if ($OpaqueBackground) {
    $arguments += '-flatten'
  }

  $arguments += @(
    '-strip',
    '-define', 'png:exclude-chunks=date,time',
    $outputPath
  )
  & $magick.Source @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "ImageMagick failed to generate $OutputName."
  }
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Write-PwaIcon -Size 192 -OutputName 'pwa-icon-192.png'
Write-PwaIcon -Size 512 -OutputName 'pwa-icon-512.png'
Write-PwaIcon -Size 512 -OutputName 'pwa-maskable-512.png' -OpaqueBackground
