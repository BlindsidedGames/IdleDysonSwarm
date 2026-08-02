param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$webRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $webRoot '..\Assets\Sprites\MenuIcons\icons-menu-12_Bots.png'
$outputDirectory = Join-Path $webRoot 'public\icons'

function Write-PwaIcon {
  param(
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][double]$ContentScale,
    [Parameter(Mandatory = $true)][string]$OutputName
  )

  $source = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(255, 47, 23, 56))
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $contentSize = [int][Math]::Round($Size * $ContentScale)
    $offset = [int][Math]::Round(($Size - $contentSize) / 2)
    $graphics.DrawImage($source, $offset, $offset, $contentSize, $contentSize)
    $bitmap.Save(
      (Join-Path $outputDirectory $OutputName),
      [System.Drawing.Imaging.ImageFormat]::Png
    )
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
    $source.Dispose()
  }
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Write-PwaIcon -Size 192 -ContentScale 0.82 -OutputName 'pwa-icon-192.png'
Write-PwaIcon -Size 512 -ContentScale 0.82 -OutputName 'pwa-icon-512.png'
Write-PwaIcon -Size 512 -ContentScale 0.64 -OutputName 'pwa-maskable-512.png'
