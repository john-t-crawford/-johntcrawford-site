# ============================================================
#  CleanupArchive.ps1  --  Crawford Drive Cleanup
#  Zips older 50%, keeps newer 50%, removes duplicates
#  Dates sourced from AnalyzeDates.ps1 scan on Apr 25, 2026
# ============================================================
#
#  HOW TO RUN:
#    Right-click -> "Run with PowerShell"
#    First run: DryRun = $true  (safe preview)
#    Second run: DryRun = $false (execute for real)
#
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

# ── MASTER SWITCH ──────────────────────────────────────────
$DryRun = $false   # LIVE RUN -- files will be zipped and deleted
# ──────────────────────────────────────────────────────────

# ── FOLDER SETTINGS (dates from AnalyzeDates scan) ────────
$FolderJobs = @(
    @{
        Target      = "D:\HUB-03-17-2022"
        CutoffDate  = [datetime]"2022-03-17"   # 50% split: Mar 17, 2022
        Archive     = "D:\ARCHIVES\HUB-03-17-2022-old.zip"
        CompareWith = "D:\HUB"                 # Delete dupes vs HUB
        Skip        = $false
        Note        = "Old work snapshot -- zip 76.76 GB, keep 5.76 GB"
    },
    @{
        Target      = "D:\_archive"
        CutoffDate  = [datetime]"2019-03-02"   # 50% split: Mar 02, 2019
        Archive     = "D:\ARCHIVES\_archive-pre2019.zip"
        CompareWith = ""
        Skip        = $false
        Note        = "Old archive -- zip 113.7 GB, keep 261.59 GB"
    },
    @{
        Target      = "D:\New folder"
        CutoffDate  = [datetime]"2021-01-01"   # Updated: capture all 2020 files
        Archive     = "D:\ARCHIVES\NewFolder-pre2020.zip"
        CompareWith = ""
        Skip        = $false
        Note        = "Large dump folder -- zip 145.31 GB, keep 451.27 GB"
    },
    @{
        Target      = "D:\HUB"
        CutoffDate  = [datetime]"2021-04-06"   # All files same date -- SKIPPED
        Archive     = ""
        CompareWith = ""
        Skip        = $true
        Note        = "SKIPPED -- all files from same 2 days, date split not meaningful"
    }
)
# ──────────────────────────────────────────────────────────

function Write-Head($msg)  { Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "  !!  $msg" -ForegroundColor Yellow }
function Write-Del($msg)   { Write-Host "  DEL $msg" -ForegroundColor Red }
function Write-Zip($msg)   { Write-Host "  ZIP $msg" -ForegroundColor Magenta }
function Write-Skip($msg)  { Write-Host "  --- $msg" -ForegroundColor DarkGray }

# Header
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Crawford Drive Cleanup -- D:\ Seagate      " -ForegroundColor Cyan
Write-Host "  Run date: $(Get-Date -Format 'MMM dd, yyyy hh:mm tt')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host ""
    Write-Host "  *** DRY RUN -- no files will be changed ***" -ForegroundColor Yellow
    Write-Host "  *** Set DryRun = false to execute         ***" -ForegroundColor Yellow
}

# Create ARCHIVES folder
$archiveRoot = "D:\ARCHIVES"
if (-not (Test-Path $archiveRoot) -and -not $DryRun) {
    New-Item -ItemType Directory -Path $archiveRoot | Out-Null
    Write-Ok "Created D:\ARCHIVES output folder"
} elseif (-not (Test-Path $archiveRoot)) {
    Write-Warn "Will create D:\ARCHIVES on real run"
}

# ── Grand totals tracker ───────────────────────────────────
$grandDupFiles = 0; $grandDupGB = 0
$grandZipFiles = 0; $grandZipGB = 0
$grandKeepFiles = 0; $grandKeepGB = 0

# ── Process each folder ────────────────────────────────────
foreach ($job in $FolderJobs) {

    Write-Head "FOLDER: $($job.Target)"
    Write-Host "  Note: $($job.Note)" -ForegroundColor DarkGray

    if ($job.Skip) {
        Write-Skip "SKIPPED -- see note above"
        continue
    }

    if (-not (Test-Path $job.Target)) {
        Write-Warn "Folder not found -- skipping"
        continue
    }

    # Build duplicate index from comparison folder
    $compareIndex = @{}
    if ($job.CompareWith -and (Test-Path $job.CompareWith)) {
        Write-Host "  Indexing comparison folder: $($job.CompareWith)..." -NoNewline
        Get-ChildItem -Path $job.CompareWith -Recurse -File | ForEach-Object {
            $key = "$($_.Name)|$($_.Length)"
            $compareIndex[$key] = $_.FullName
        }
        Write-Host " $($compareIndex.Count) files indexed" -ForegroundColor Green
    }

    # Scan target
    Write-Host "  Scanning $($job.Target)..." -NoNewline
    $allFiles = Get-ChildItem -Path $job.Target -Recurse -File
    Write-Host " $($allFiles.Count) files" -ForegroundColor Green

    $duplicates = [System.Collections.Generic.List[string]]::new()
    $toZip      = [System.Collections.Generic.List[string]]::new()
    $toKeep     = [System.Collections.Generic.List[string]]::new()
    $dupSize = 0; $zipSize = 0; $keepSize = 0

    foreach ($file in $allFiles) {
        $key = "$($file.Name)|$($file.Length)"

        if ($compareIndex.ContainsKey($key)) {
            $duplicates.Add($file.FullName)
            $dupSize += $file.Length
            continue
        }

        $fileDate = if ($file.LastWriteTime -gt $file.CreationTime) { $file.LastWriteTime } else { $file.CreationTime }

        if ($fileDate -lt $job.CutoffDate) {
            $toZip.Add($file.FullName)
            $zipSize += $file.Length
        } else {
            $toKeep.Add($file.FullName)
            $keepSize += $file.Length
        }
    }

    $dupGB  = [math]::Round($dupSize  / 1GB, 2)
    $zipGB  = [math]::Round($zipSize  / 1GB, 2)
    $keepGB = [math]::Round($keepSize / 1GB, 2)

    Write-Host ""
    Write-Host "  Cutoff date : $($job.CutoffDate.ToString('MMM dd, yyyy'))"
    Write-Del  "Duplicates  : $($duplicates.Count) files = $dupGB GB  --> DELETE"
    Write-Zip  "To archive  : $($toZip.Count) files = $zipGB GB  --> $($job.Archive)"
    Write-Ok   "To keep     : $($toKeep.Count) files = $keepGB GB  --> leave alone"

    $grandDupFiles  += $duplicates.Count;  $grandDupGB  += $dupGB
    $grandZipFiles  += $toZip.Count;       $grandZipGB  += $zipGB
    $grandKeepFiles += $toKeep.Count;      $grandKeepGB += $keepGB

    # Sample preview
    if ($duplicates.Count -gt 0) {
        Write-Host "`n  Sample duplicates:" -ForegroundColor DarkRed
        $duplicates | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
    if ($toZip.Count -gt 0) {
        Write-Host "`n  Sample files to zip:" -ForegroundColor DarkMagenta
        $toZip | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkMagenta }
    }

    # ── Execute if not dry run ─────────────────────────────
    if (-not $DryRun) {

        # Delete duplicates
        if ($duplicates.Count -gt 0) {
            Write-Host "`n  Deleting $($duplicates.Count) duplicates..." -ForegroundColor Red
            foreach ($f in $duplicates) {
                Remove-Item -Path $f -Force -ErrorAction SilentlyContinue
            }
            Write-Ok "Duplicates deleted"
        }

        # Zip old files
        if ($toZip.Count -gt 0 -and $job.Archive) {
            Write-Host "`n  Zipping $($toZip.Count) old files..." -ForegroundColor Magenta

            Add-Type -AssemblyName System.IO.Compression.FileSystem
            if (Test-Path $job.Archive) { Remove-Item $job.Archive }

            $zip     = [System.IO.Compression.ZipFile]::Open($job.Archive, 'Create')
            $baseLen = $job.Target.Length + 1
            $zipped  = 0

            foreach ($f in $toZip) {
                $entryName = $f.Substring($baseLen).Replace('\', '/')
                try {
                    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f, $entryName) | Out-Null
                    $zipped++
                } catch { }
            }
            $zip.Dispose()

            $archiveMB = [math]::Round((Get-Item $job.Archive).Length / 1MB, 1)
            Write-Ok "Archive created: $($job.Archive) ($archiveMB MB on disk)"

            # Delete originals after successful zip
            Write-Host "  Removing originals..." -ForegroundColor Magenta
            foreach ($f in $toZip) {
                Remove-Item -Path $f -Force -ErrorAction SilentlyContinue
            }

            # Clean empty folders
            Get-ChildItem -Path $job.Target -Recurse -Directory |
                Sort-Object FullName -Descending |
                Where-Object { (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count -eq 0 } |
                Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        }

        Write-Ok "Done: $($job.Target)"
    }

    Write-Host "`n  ---------------------------------------------" -ForegroundColor DarkGray
}

# ── Grand Summary ──────────────────────────────────────────
$totalSaveGB = [math]::Round($grandDupGB + $grandZipGB, 2)

Write-Host ""
Write-Host "=============================================" -ForegroundColor $(if ($DryRun) { "Yellow" } else { "Green" })
Write-Host "  SUMMARY $(if ($DryRun) { '(DRY RUN PREVIEW)' } else { '(COMPLETED)' })" -ForegroundColor $(if ($DryRun) { "Yellow" } else { "Green" })
Write-Host "=============================================" -ForegroundColor $(if ($DryRun) { "Yellow" } else { "Green" })
Write-Host ""
Write-Host "  Duplicates removed : $grandDupFiles files = $grandDupGB GB" -ForegroundColor Red
Write-Host "  Files zipped       : $grandZipFiles files = $grandZipGB GB" -ForegroundColor Magenta
Write-Host "  Files kept         : $grandKeepFiles files = $grandKeepGB GB" -ForegroundColor Green
Write-Host ""
Write-Host "  TOTAL SPACE FREED  : ~$totalSaveGB GB" -ForegroundColor $(if ($DryRun) { "Yellow" } else { "Green" })
Write-Host ""

if ($DryRun) {
    Write-Host "  To run for real:" -ForegroundColor Yellow
    Write-Host "    1. Open CleanupArchive.ps1 in Notepad" -ForegroundColor Yellow
    Write-Host "    2. Change:  DryRun = `$true  -->  DryRun = `$false" -ForegroundColor Yellow
    Write-Host "    3. Save and run again" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
