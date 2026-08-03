param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$webRoot = Split-Path -Parent $PSScriptRoot
$gameIconPath = Resolve-Path (Join-Path $webRoot '..\Assets\Sprites\MenuIcons\icons-menu-12_Bots.png')
$pwaIconPath = Resolve-Path (Join-Path $webRoot 'public\icons\pwa-icon-512.png')
$androidResourceRoot = Join-Path $webRoot 'hosts\capacitor\android\app\src\main\res'
$iosAssetRoot = Join-Path $webRoot 'hosts\capacitor\ios\App\App\Assets.xcassets'
$themeColor = [System.Drawing.Color]::FromArgb(255, 47, 23, 56)

function Write-ScaledImage {
  param(
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [Parameter(Mandatory = $true)][string]$DestinationPath,
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height,
    [Parameter(Mandatory = $true)][double]$ContentScale,
    [Parameter(Mandatory = $true)][bool]$DrawBackground
  )

  $source = [System.Drawing.Image]::FromFile($SourcePath)
  $pixelFormat = if ($DrawBackground) {
    [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
  }
  else {
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  }
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, $pixelFormat)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    if ($DrawBackground) {
      $graphics.Clear($themeColor)
    }
    else {
      $graphics.Clear([System.Drawing.Color]::Transparent)
    }
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $contentSize = [int][Math]::Round([Math]::Min($Width, $Height) * $ContentScale)
    $x = [int][Math]::Round(($Width - $contentSize) / 2)
    $y = [int][Math]::Round(($Height - $contentSize) / 2)
    $graphics.DrawImage($source, $x, $y, $contentSize, $contentSize)
    $bitmap.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
    $source.Dispose()
  }
}

$androidDensities = @{
  'mdpi' = @{ Legacy = 48; Foreground = 108 }
  'hdpi' = @{ Legacy = 72; Foreground = 162 }
  'xhdpi' = @{ Legacy = 96; Foreground = 216 }
  'xxhdpi' = @{ Legacy = 144; Foreground = 324 }
  'xxxhdpi' = @{ Legacy = 192; Foreground = 432 }
}

foreach ($density in $androidDensities.GetEnumerator()) {
  $directory = Join-Path $androidResourceRoot "mipmap-$($density.Key)"
  $legacySize = $density.Value.Legacy
  $foregroundSize = $density.Value.Foreground
  Write-ScaledImage $pwaIconPath (Join-Path $directory 'ic_launcher.png') $legacySize $legacySize 1 $false
  Write-ScaledImage $pwaIconPath (Join-Path $directory 'ic_launcher_round.png') $legacySize $legacySize 1 $false
  Write-ScaledImage $gameIconPath (Join-Path $directory 'ic_launcher_foreground.png') $foregroundSize $foregroundSize 0.64 $false
}

$androidSplashes = @{
  'drawable' = @(480, 320)
  'drawable-land-mdpi' = @(480, 320)
  'drawable-land-hdpi' = @(800, 480)
  'drawable-land-xhdpi' = @(1280, 720)
  'drawable-land-xxhdpi' = @(1600, 960)
  'drawable-land-xxxhdpi' = @(1920, 1280)
  'drawable-port-mdpi' = @(320, 480)
  'drawable-port-hdpi' = @(480, 800)
  'drawable-port-xhdpi' = @(720, 1280)
  'drawable-port-xxhdpi' = @(960, 1600)
  'drawable-port-xxxhdpi' = @(1280, 1920)
}

foreach ($splash in $androidSplashes.GetEnumerator()) {
  $destination = Join-Path (Join-Path $androidResourceRoot $splash.Key) 'splash.png'
  Write-ScaledImage $gameIconPath $destination $splash.Value[0] $splash.Value[1] 0.28 $true
}

Write-ScaledImage $pwaIconPath `
  (Join-Path $iosAssetRoot 'AppIcon.appiconset\AppIcon-512@2x.png') `
  1024 1024 1 $true

foreach ($splashName in @(
  'splash-2732x2732.png',
  'splash-2732x2732-1.png',
  'splash-2732x2732-2.png'
)) {
  Write-ScaledImage $gameIconPath `
    (Join-Path $iosAssetRoot "Splash.imageset\$splashName") `
    2732 2732 0.28 $true
}

Write-Output 'Synced native branding from approved Idle Dyson Swarm assets.'
