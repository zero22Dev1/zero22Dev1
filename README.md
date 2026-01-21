```bat
@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "BACKUPBASE=%SCRIPT_DIR%backup"
set "OUTBASE=%SCRIPT_DIR%output"

if "%~1"=="" goto :help

set "BACKUPBASE=%BACKUPBASE%"
set "OUTBASE=%OUTBASE%"

set "PS1=%TEMP%\convert_metabase_%RANDOM%%RANDOM%.ps1"

> "%PS1%"  echo $ErrorActionPreference = "Continue"
>>"%PS1%"  echo $utf8 = [System.Text.Encoding]::UTF8
>>"%PS1%"  echo $sjis = [System.Text.Encoding]::GetEncoding("shift_jis")
>>"%PS1%"  echo.
>>"%PS1%"  echo # ---- Build Japanese carrier names from Unicode to avoid garbling ----
>>"%PS1%"  echo $seinoJp = [string]::Concat([char]0x897F,[char]0x6FC3)                                       # 西濃
>>"%PS1%"  echo $fukuJp  = [string]::Concat([char]0x798F,[char]0x5C71)                                       # 福山
>>"%PS1%"  echo $fukuTsu = [string]::Concat([char]0x798F,[char]0x5C71,[char]0x901A,[char]0x904B)             # 福山通運
>>"%PS1%"  echo.
>>"%PS1%"  echo $backupBaseRoot = $env:BACKUPBASE
>>"%PS1%"  echo $outBaseRoot    = $env:OUTBASE
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $backupBaseRoot ^| Out-Null
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $outBaseRoot    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo function Get-Carrier([string]$name){
>>"%PS1%"  echo   # 福山（福山通運含む）
>>"%PS1%"  echo   if($name -match $fukuTsu -or $name -match $fukuJp -or $name -match "fukuyama"){ return $fukuJp }
>>"%PS1%"  echo   # 西濃
>>"%PS1%"  echo   if($name -match $seinoJp -or $name -match "seino"){ return $seinoJp }
>>"%PS1%"  echo   return "other"
>>"%PS1%"  echo }
>>"%PS1%"  echo.
>>"%PS1%"  echo function Get-DateKey([string]$name){
>>"%PS1%"  echo   if($name -match "(?<d>\d{8})"){ return $Matches["d"] }
>>"%PS1%"  echo   return (Get-Date).ToString("yyyyMMdd")
>>"%PS1%"  echo }
>>"%PS1%"  echo.
>>"%PS1%"  echo function Remove-Header([string[]]$lines){
>>"%PS1%"  echo   if($null -eq $lines -or $lines.Length -le 1){ return @() }
>>"%PS1%"  echo   return $lines[1..($lines.Length-1)]
>>"%PS1%"  echo }
>>"%PS1%"  echo.
>>"%PS1%"  echo function CsvToTsvLines([string[]]$csvLines){
>>"%PS1%"  echo   # CSVを正しくパースしてTSVへ（引用符内のカンマを壊さない）
>>"%PS1%"  echo   $out = New-Object System.Collections.Generic.List[string]
>>"%PS1%"  echo   foreach($line in $csvLines){
>>"%PS1%"  echo     $fields = @()
>>"%PS1%"  echo     $sb = New-Object System.Text.StringBuilder
>>"%PS1%"  echo     $inQuote = $false
>>"%PS1%"  echo     for($i=0; $i -lt $line.Length; $i++){
>>"%PS1%"  echo       $c = $line[$i]
>>"%PS1%"  echo       if($c -eq '""'){
>>"%PS1%"  echo         if($inQuote -and $i+1 -lt $line.Length -and $line[$i+1] -eq '""'){
>>"%PS1%"  echo           [void]$sb.Append('""'); $i++; continue
>>"%PS1%"  echo         }
>>"%PS1%"  echo         $inQuote = -not $inQuote
>>"%PS1%"  echo         continue
>>"%PS1%"  echo       }
>>"%PS1%"  echo       if(-not $inQuote -and $c -eq ','){
>>"%PS1%"  echo         $fields += $sb.ToString()
>>"%PS1%"  echo         [void]$sb.Clear()
>>"%PS1%"  echo         continue
>>"%PS1%"  echo       }
>>"%PS1%"  echo       [void]$sb.Append($c)
>>"%PS1%"  echo     }
>>"%PS1%"  echo     $fields += $sb.ToString()
>>"%PS1%"  echo     $out.Add(($fields -join "`t"))
>>"%PS1%"  echo   }
>>"%PS1%"  echo   return ,$out.ToArray()
>>"%PS1%"  echo }
>>"%PS1%"  echo.
>>"%PS1%"  echo $inputs = @($args)
>>"%PS1%"  echo if($inputs.Count -eq 0){ Write-Host "No args."; exit 1 }
>>"%PS1%"  echo Write-Host "Args count: $($inputs.Count)"
>>"%PS1%"  echo.
>>"%PS1%"  echo $processed = 0
>>"%PS1%"  echo foreach($p in $inputs){
>>"%PS1%"  echo   Write-Host "INPUT: $p"
>>"%PS1%"  echo   $targets = @()
>>"%PS1%"  echo   if(Test-Path -LiteralPath $p){
>>"%PS1%"  echo     $item = Get-Item -LiteralPath $p
>>"%PS1%"  echo     if($item.PSIsContainer){
>>"%PS1%"  echo       $targets = @(Get-ChildItem -LiteralPath $p -Filter *.csv -File -ErrorAction SilentlyContinue)
>>"%PS1%"  echo     } else {
>>"%PS1%"  echo       $targets = @($item)
>>"%PS1%"  echo     }
>>"%PS1%"  echo   } else {
>>"%PS1%"  echo     $targets = @(Get-ChildItem -Path $p -Filter *.csv -File -ErrorAction SilentlyContinue)
>>"%PS1%"  echo     if(-not $targets){
>>"%PS1%"  echo       $targets = @(Get-ChildItem -Path $p -File -ErrorAction SilentlyContinue)
>>"%PS1%"  echo     }
>>"%PS1%"  echo   }
>>"%PS1%"  echo.
>>"%PS1%"  echo   if(-not $targets){
>>"%PS1%"  echo     Write-Warning ("Not found: " + $p)
>>"%PS1%"  echo     continue
>>"%PS1%"  echo   }
>>"%PS1%"  echo.
>>"%PS1%"  echo   foreach($f in $targets){
>>"%PS1%"  echo     try{
>>"%PS1%"  echo       if($f.PSIsContainer){ continue }
>>"%PS1%"  echo       $carrier = Get-Carrier $f.Name
>>"%PS1%"  echo       $dateKey = Get-DateKey $f.Name
>>"%PS1%"  echo.
>>"%PS1%"  echo       # output\<運送会社>\yyyymmdd , backup\<運送会社>\yyyymmdd
>>"%PS1%"  echo       $backupDir = Join-Path (Join-Path $backupBaseRoot $carrier) $dateKey
>>"%PS1%"  echo       $outDir    = Join-Path (Join-Path $outBaseRoot    $carrier) $dateKey
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $backupDir ^| Out-Null
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $outDir    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
>>"%PS1%"  echo       $ext  = $f.Extension
>>"%PS1%"  echo       $t = (Get-Date).ToString("HHmmssfff")
>>"%PS1%"  echo.
>>"%PS1%"  echo       $lines = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
>>"%PS1%"  echo       $body  = Remove-Header $lines
>>"%PS1%"  echo.
>>"%PS1%"  echo       if($carrier -eq $fukuJp){
>>"%PS1%"  echo         # 福山：TSV化してtxt（Shift-JIS）
>>"%PS1%"  echo         $tsvLines = CsvToTsvLines $body
>>"%PS1%"  echo         $outPath = Join-Path $outDir ($base + "_sjis_noheader_" + $t + ".txt")
>>"%PS1%"  echo         [System.IO.File]::WriteAllLines($outPath, $tsvLines, $sjis)
>>"%PS1%"  echo       } elseif($carrier -eq $seinoJp){
>>"%PS1%"  echo         # 西濃：Shift-JIS（拡張子そのまま）
>>"%PS1%"  echo         $outPath = Join-Path $outDir ($base + "_sjis_noheader_" + $t + $ext)
>>"%PS1%"  echo         [System.IO.File]::WriteAllLines($outPath, $body, $sjis)
>>"%PS1%"  echo       } else {
>>"%PS1%"  echo         # other：処理しない（スキップしたいならこのままでOK）
>>"%PS1%"  echo         Write-Warning ("Skipped (carrier=other): " + $f.Name)
>>"%PS1%"  echo         continue
>>"%PS1%"  echo       }
>>"%PS1%"  echo.
>>"%PS1%"  echo       $ts2 = (Get-Date).ToString("yyyyMMdd_HHmmssfff")
>>"%PS1%"  echo       $bakPath = Join-Path $backupDir ($base + "_" + $ts2 + $ext)
>>"%PS1%"  echo       Move-Item -LiteralPath $f.FullName -Destination $bakPath -Force
>>"%PS1%"  echo.
>>"%PS1%"  echo       $processed++
>>"%PS1%"  echo       Write-Host ("OK: " + $f.Name + "  carrier=" + $carrier)
>>"%PS1%"  echo       Write-Host ("  out   : " + $outPath)
>>"%PS1%"  echo       Write-Host ("  backup: " + $bakPath)
>>"%PS1%"  echo     } catch {
>>"%PS1%"  echo       Write-Error ("Failed: " + $f.FullName + " : " + $_.Exception.Message)
>>"%PS1%"  echo     }
>>"%PS1%"  echo   }
>>"%PS1%"  echo }
>>"%PS1%"  echo.
>>"%PS1%"  echo Write-Host ("Processed files: " + $processed)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
del "%PS1%" >nul 2>nul

echo.
pause
exit /b 0

:help
echo 使い方:
echo   CSVを1つ/複数選択して、このbatにドラッグ＆ドロップ
echo   フォルダをドロップするとその中のCSVを全部処理します
echo.
pause
exit /b 1
```