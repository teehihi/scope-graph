param(
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$videoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $videoRoot '..\..')).Path
$toolRoot = Join-Path $videoRoot 'hyperframes'
$project = Join-Path $toolRoot 'project'
$ffmpeg = Join-Path $toolRoot 'node_modules\@ffmpeg-installer\win32-x64\ffmpeg.exe'
$ffprobe = Join-Path $toolRoot 'node_modules\@ffprobe-installer\win32-x64\ffprobe.exe'
$python = Join-Path $repoRoot '.venv\Scripts\python.exe'
$output = Join-Path $videoRoot 'output\scopegraph-hackathon-demo.mp4'

foreach ($path in @($ffmpeg, $ffprobe, $python)) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing required local tool: $path" }
}

$env:HYPERFRAMES_FFMPEG_PATH = $ffmpeg
$env:HYPERFRAMES_FFPROBE_PATH = $ffprobe

Push-Location $project
try {
    & $python build_video.py
    if ($LASTEXITCODE -ne 0) { throw 'Composition build failed' }
    npx --no-install hyperframes check --json
    if ($LASTEXITCODE -ne 0) { throw 'HyperFrames check failed' }
    if (-not $CheckOnly) {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
        npx --no-install hyperframes render --quality looks --workers 1 --low-memory-mode -o $output
        if ($LASTEXITCODE -ne 0) { throw 'HyperFrames render failed' }
        & $ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of json $output
        if ($LASTEXITCODE -ne 0) { throw 'FFprobe failed' }
    }
} finally {
    Pop-Location
}
