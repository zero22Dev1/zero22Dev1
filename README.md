

```sql

WITH base AS (
  SELECT
    pk_class,
    consumer_name,
    product_cd,
    ROW_NUMBER() OVER (
      PARTITION BY pk_class
      ORDER BY product_cd  -- ← 明細の並び順（必要に応じて変更）
    ) AS rn
  FROM src
)
SELECT
  999 AS item1,
  /* ヘッダ行の項目2/3：そのPK_CLASS内の先頭行の値を採用する例 */
  MAX(consumer_name) KEEP (DENSE_RANK FIRST ORDER BY rn) AS item2,
  MAX(product_cd)    KEEP (DENSE_RANK FIRST ORDER BY rn) AS item3
FROM base
GROUP BY pk_class

UNION ALL

SELECT
  rn   AS item1,
  consumer_name AS item2,
  product_cd    AS item3
FROM base

ORDER BY
  pk_class,
  CASE WHEN item1 = 999 THEN 0 ELSE 1 END,
  item1;

COUNT(CASE WHEN p.product_name = 'jiniA' THEN 1 END) AS package_a_count,
COUNT(CASE WHEN p.product_name = 'jiniB' THEN 1 END) AS package_b_count

```
```cmd
change_mysql80_port_and_restart.bat 3307
```

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
>>"%PS1%"  echo $backupBase = $env:BACKUPBASE
>>"%PS1%"  echo $outBase    = $env:OUTBASE
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $backupBase ^| Out-Null
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $outBase    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo function Get-Carrier([string]$name){
>>"%PS1%"  echo   if($name -match "ヤマト|yamato"){ return "ヤマト" }
>>"%PS1%"  echo   if($name -match "西濃|seino"){ return "西濃" }
>>"%PS1%"  echo   if($name -match "第一貨物|だいいち|daiichi"){ return "第一貨物" }
>>"%PS1%"  echo   return "other"
>>"%PS1%"  echo }
>>"%PS1%"  echo.
>>"%PS1%"  echo function Get-DateKey([string]$name){
>>"%PS1%"  echo   if($name -match "(?<d>\d{8})"){ return $Matches["d"] }
>>"%PS1%"  echo   return (Get-Date).ToString("yyyyMMdd")
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
>>"%PS1%"  echo       $backupDir = Join-Path (Join-Path $backupBase $carrier) $dateKey
>>"%PS1%"  echo       $outDir    = Join-Path (Join-Path $outBase    $carrier) $dateKey
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $backupDir ^| Out-Null
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $outDir    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
>>"%PS1%"  echo       $ext  = $f.Extension
>>"%PS1%"  echo       $t = (Get-Date).ToString("HHmmssfff")
>>"%PS1%"  echo       $outPath = Join-Path $outDir ($base + "_sjis_" + $t + $ext)
>>"%PS1%"  echo.
>>"%PS1%"  echo       $text = [System.IO.File]::ReadAllText($f.FullName, $utf8)
>>"%PS1%"  echo       [System.IO.File]::WriteAllText($outPath, $text, $sjis)
>>"%PS1%"  echo.
>>"%PS1%"  echo       $ts = (Get-Date).ToString("yyyyMMdd_HHmmssfff")
>>"%PS1%"  echo       $bakPath = Join-Path $backupDir ($base + "_" + $ts + $ext)
>>"%PS1%"  echo       Move-Item -LiteralPath $f.FullName -Destination $bakPath -Force
>>"%PS1%"  echo.
>>"%PS1%"  echo       $processed++
>>"%PS1%"  echo       Write-Host ("OK: " + $f.Name)
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
echo Convert-MetabaseCsv.bat
echo 使い方:
echo   CSVを1つ/複数選択して、このbatにドラッグ＆ドロップ
echo   フォルダをドロップするとその中のCSVを全部処理します
echo.
pause
exit /b 1
```

```bat
@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "WORKDIR=荷札連携用"
set "BACKUPBASE=%SCRIPT_DIR%backup\%WORKDIR%"
set "OUTBASE=%SCRIPT_DIR%output\%WORKDIR%"

if "%~1"=="" goto :help

set "BACKUPBASE=%BACKUPBASE%"
set "OUTBASE=%OUTBASE%"

set "PS1=%TEMP%\convert_metabase_%RANDOM%%RANDOM%.ps1"

> "%PS1%"  echo $ErrorActionPreference = "Continue"
>>"%PS1%"  echo $utf8 = [System.Text.Encoding]::UTF8
>>"%PS1%"  echo $sjis = [System.Text.Encoding]::GetEncoding("shift_jis")
>>"%PS1%"  echo $backupBase = $env:BACKUPBASE
>>"%PS1%"  echo $outBase    = $env:OUTBASE
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $backupBase ^| Out-Null
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $outBase    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo function Get-DateKey([string]$name){
>>"%PS1%"  echo   if($name -match "(?<d>\d{8})"){ return $Matches["d"] }
>>"%PS1%"  echo   return (Get-Date).ToString("yyyyMMdd")
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
>>"%PS1%"  echo       $dateKey = Get-DateKey $f.Name
>>"%PS1%"  echo.
>>"%PS1%"  echo       # ディレクトリ構成：yyyymmdd のみ（出力/バックアップ）
>>"%PS1%"  echo       $backupDir = Join-Path $backupBase $dateKey
>>"%PS1%"  echo       $outDir    = Join-Path $outBase    $dateKey
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $backupDir ^| Out-Null
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $outDir    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
>>"%PS1%"  echo       $ext  = $f.Extension
>>"%PS1%"  echo       $t = (Get-Date).ToString("HHmmssfff")
>>"%PS1%"  echo       $outPath = Join-Path $outDir ($base + "_sjis_noheader_" + $t + $ext)
>>"%PS1%"  echo.
>>"%PS1%"  echo       # UTF-8で読み込み → 1行目(ヘッダー)削除 → Shift-JISで書き込み
>>"%PS1%"  echo       $lines = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
>>"%PS1%"  echo       if($lines.Length -le 1){ $outLines = @() } else { $outLines = $lines[1..($lines.Length-1)] }
>>"%PS1%"  echo       [System.IO.File]::WriteAllLines($outPath, $outLines, $sjis)
>>"%PS1%"  echo.
>>"%PS1%"  echo       # 元ファイルはバックアップへ移動
>>"%PS1%"  echo       $ts = (Get-Date).ToString("yyyyMMdd_HHmmssfff")
>>"%PS1%"  echo       $bakPath = Join-Path $backupDir ($base + "_" + $ts + $ext)
>>"%PS1%"  echo       Move-Item -LiteralPath $f.FullName -Destination $bakPath -Force
>>"%PS1%"  echo.
>>"%PS1%"  echo       $processed++
>>"%PS1%"  echo       Write-Host ("OK: " + $f.Name)
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
echo 
echo 使い方: metabase_sjis_noheader.bat
echo   CSVを1つ/複数選択して、このbatにドラッグ＆ドロップ
echo   フォルダをドロップするとその中のCSVを全部処理します
echo.
pause
exit /b 1
```


