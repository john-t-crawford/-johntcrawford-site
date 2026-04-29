# ============================================================
#  AnalyzeDates.ps1  --  Crawford Drive Date Analyzer
#  Finds the natural 50/50 date split across your files
# ============================================================
#
#  HOW TO RUN:
#    Right-click -> "Run with PowerShell"
#
# ============================================================

# Fix encoding so special characters display correctly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ── CONFIGURATION ──────────────────────────────────────────
$Folders = @(
    "D:\HUB-03-17-2022",
    "D:\HUB",
    "D:\_archive",
    "D:\New folder"
)
# ──────────────────────────────────────────────────────────

$ErrorActionPreference = "SilentlyContinue"

function Write-Header($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "  $msg" -ForegroundColor Green }

Write-Host "`n==========================================="-ForegroundColor Cyan
Write-Host   "  Drive Date Analyzer -- Crawford          " -ForegroundColor Cyan
Write-Host   "===========================================`n" -ForegroundColor Cyan

foreach ($folder in $Folders) {
    if (-not (Test-Path $folder)) {
        Write-Host "  [SKIP] Not found: $folder" -ForegroundColor DarkGray
        continue
    }

    Write-Header "[FOLDER] $folder"
    Write-Host "  Scanning..." -NoNewline

    $files = Get-ChildItem -Path $folder -Recurse -File -ErrorAction SilentlyContinue
    if ($files.Count -eq 0) {
        Write-Host " (empty)" -ForegroundColor DarkGray
        continue
    }

    Write-Host " $($files.Count) files found" -ForegroundColor Green

    # Use the best available date per file
    $dates = $files | ForEach-Object {
        if ($_.LastWriteTime -gt $_.CreationTime) { $_.LastWriteTime } else { $_.CreationTime }
    } | Sort-Object

    $totalFiles = $dates.Count
    $medianIdx  = [math]::Floor($totalFiles / 2)
    $median     = $dates[$medianIdx]

    $oldest  = $dates[0]
    $newest  = $dates[-1]
    $p25     = $dates[[math]::Floor($totalFiles * 0.25)]
    $p75     = $dates[[math]::Floor($totalFiles * 0.75)]

    Write-Host "`n  Date range:"
    Write-Host "    Oldest file : $($oldest.ToString('MMM dd, yyyy'))" -ForegroundColor DarkGray
    Write-Host "    25% mark    : $($p25.ToString('MMM dd, yyyy'))" -ForegroundColor Yellow
    Write-Host "    ** 50% mark : $($median.ToString('MMM dd, yyyy'))  << natural split point" -ForegroundColor Green
    Write-Host "    75% mark    : $($p75.ToString('MMM dd, yyyy'))" -ForegroundColor Yellow
    Write-Host "    Newest file : $($newest.ToString('MMM dd, yyyy'))" -ForegroundColor White

    # Year distribution
    Write-Host "`n  Files by year:"
    $byYear = $dates | Group-Object { $_.Year } | Sort-Object Name
    $maxCount = ($byYear | Measure-Object -Property Count -Maximum).Maximum

    foreach ($yr in $byYear) {
        $bar = "█" * [math]::Round(($yr.Count / $maxCount) * 30)
        $pct = [math]::Round(($yr.Count / $totalFiles) * 100)
        $color = if ($yr.Group[0] -lt $median) { "DarkGray" } else { "White" }
        $marker = if ([math]::Abs(($yr.Group[0] - $median).TotalDays) -lt 366) { " << keep from here" } else { "" }
        Write-Host ("    {0}  {1,-32} {2,4} files ({3}%){4}" -f $yr.Name, $bar, $yr.Count, $pct, $marker) -ForegroundColor $color
    }

    # Size split
    $oldFiles  = $files | Where-Object {
        $d = if ($_.LastWriteTime -gt $_.CreationTime) { $_.LastWriteTime } else { $_.CreationTime }
        $d -lt $median
    }
    $newFiles  = $files | Where-Object {
        $d = if ($_.LastWriteTime -gt $_.CreationTime) { $_.LastWriteTime } else { $_.CreationTime }
        $d -ge $median
    }

    $oldGB = [math]::Round(($oldFiles | Measure-Object Length -Sum).Sum / 1GB, 2)
    $newGB = [math]::Round(($newFiles | Measure-Object Length -Sum).Sum / 1GB, 2)

    Write-Host "`n  Size split at $($median.ToString('MMM dd, yyyy')):"
    Write-Host "    Older half (delete/zip) : $($oldFiles.Count) files = $oldGB GB" -ForegroundColor Red
    Write-Host "    Newer half (keep)       : $($newFiles.Count) files = $newGB GB" -ForegroundColor Green
    Write-Host ""
    Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
}

Write-Host "`n======================================================" -ForegroundColor Yellow
Write-Host   "  Copy the '50% mark' dates above into               " -ForegroundColor Yellow
Write-Host   "  CleanupArchive.ps1 as your CutoffDate value        " -ForegroundColor Yellow
Write-Host   "======================================================`n" -ForegroundColor Yellow

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
