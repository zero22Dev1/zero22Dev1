```sql

SELECT id, name FROM users
UNION ALL
SELECT id, name FROM users
UNION ALL
SELECT id, name FROM users
UNION ALL
SELECT id, name FROM users
UNION ALL
SELECT id, name FROM users;



SELECT
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(col, '-', '－'),
                    '0','０'),
                  '1','１'),
                '2','２'),
              '3','３'),
            '4','４'),
          '5','５'),
        '6','６'),
      '7','７'),
    '8','８'),
  '9','９') AS col_zenkaku
FROM your_table;
```




```bat
@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "BACKUPBASE=%SCRIPT_DIR%backup"
set "OUTBASE=%SCRIPT_DIR%output"

if "%~1"=="" goto :help

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
>>"%PS1%"  echo   if($name -match "福山|fukuyama"){ return "福山" }
>>"%PS1%"  echo   return "other"
>>"%PS1%"  echo }
>>"%PS1%"  echo.

>>"%PS1%"  echo function Get-DateKey([string]$name){
>>"%PS1%"  echo   if($name -match "(?<d>\d{8})"){ return $Matches["d"] }
>>"%PS1%"  echo   return (Get-Date).ToString("yyyyMMdd")
>>"%PS1%"  echo }
>>"%PS1%"  echo.

>>"%PS1%"  echo function Pad-Zenkaku40([string]$s){
>>"%PS1%"  echo   if($null -eq $s){ return $s }
>>"%PS1%"  echo   $target = 40
>>"%PS1%"  echo   if($s.Length -ge $target){ return $s }
>>"%PS1%"  echo   $fwsp = [char]0x3000  # 全角スペース
>>"%PS1%"  echo   return $s + ($fwsp * ($target - $s.Length))
>>"%PS1%"  echo }
>>"%PS1%"  echo.

>>"%PS1%"  echo function Parse-CsvFields([string]$line){
>>"%PS1%"  echo   # CSVのカンマ/ダブルクォートを考慮して分解（TextFieldParser）
>>"%PS1%"  echo   Add-Type -AssemblyName Microsoft.VisualBasic ^| Out-Null
>>"%PS1%"  echo   $sr = New-Object System.IO.StringReader($line)
>>"%PS1%"  echo   $p  = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($sr)
>>"%PS1%"  echo   $p.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
>>"%PS1%"  echo   $p.SetDelimiters(",")
>>"%PS1%"  echo   $p.HasFieldsEnclosedInQuotes = $true
>>"%PS1%"  echo   $fields = $p.ReadFields()
>>"%PS1%"  echo   $p.Close()
>>"%PS1%"  echo   return ,$fields
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

>>"%PS1%"  echo       # 出力ファイル名を固定（運送会社ごと）＋福山だけ txt
>>"%PS1%"  echo       $inExt = $f.Extension
>>"%PS1%"  echo       switch($carrier){
>>"%PS1%"  echo         "西濃"     { $outFile = "seino";    $outExt = $inExt;  break }
>>"%PS1%"  echo         "第一貨物" { $outFile = "daiichi";  $outExt = $inExt;  break }
>>"%PS1%"  echo         "ヤマト"   { $outFile = "yamato";   $outExt = $inExt;  break }
>>"%PS1%"  echo         "福山"     { $outFile = "fukuyama"; $outExt = ".txt";  break }
>>"%PS1%"  echo         default    { $outFile = ("other_{0}" -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo       }
>>"%PS1%"  echo       $outPath = Join-Path $outDir ($outFile + $outExt)
>>"%PS1%"  echo.

>>"%PS1%"  echo       # UTF-8で読み込み → ヘッダー1行削除
>>"%PS1%"  echo       $lines = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
>>"%PS1%"  echo       if($lines.Length -le 1){ $outLines = @() } else { $outLines = $lines[1..($lines.Length-1)] }
>>"%PS1%"  echo.

>>"%PS1%"  echo       # ★福山だけ：14列目・15列目を全角40文字に右埋め
>>"%PS1%"  echo       #   ・Trimしない
>>"%PS1%"  echo       #   ・空行(完全空文字)だけ除去
>>"%PS1%"  echo       #   ・最後はカンマ削除（旧仕様と同じく行内のカンマも消える）
>>"%PS1%"  echo       if($carrier -eq "福山"){
>>"%PS1%"  echo         $outLines = @($outLines ^| Where-Object { $_ -ne $null -and $_ -ne "" })
>>"%PS1%"  echo         $newLines = New-Object System.Collections.Generic.List[string]
>>"%PS1%"  echo         foreach($ln in $outLines){
>>"%PS1%"  echo           $cols = Parse-CsvFields $ln
>>"%PS1%"  echo           if($cols.Length -ge 14){ $cols[13] = Pad-Zenkaku40 $cols[13] }  # 14列目
>>"%PS1%"  echo           if($cols.Length -ge 15){ $cols[14] = Pad-Zenkaku40 $cols[14] }  # 15列目
>>"%PS1%"  echo           $line2 = ($cols -join ",") -replace ",", ""
>>"%PS1%"  echo           $newLines.Add($line2) ^| Out-Null
>>"%PS1%"  echo         }
>>"%PS1%"  echo         $outLines = $newLines.ToArray()
>>"%PS1%"  echo       }
>>"%PS1%"  echo.

>>"%PS1%"  echo       # Shift-JISで書き込み（上書き）
>>"%PS1%"  echo       [System.IO.File]::WriteAllLines($outPath, $outLines, $sjis)
>>"%PS1%"  echo.

>>"%PS1%"  echo       # 元ファイルはバックアップへ移動（衝突しないように時刻付き）
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
>>"%PS1%"  echo       $ts = (Get-Date).ToString("yyyyMMdd_HHmmssfff")
>>"%PS1%"  echo       $bakPath = Join-Path $backupDir ($base + "_" + $ts + $inExt)
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

rem env var export (powershellから$env:BACKUPBASE/$env:OUTBASEで参照)
set "BACKUPBASE=%BACKUPBASE%"
set "OUTBASE=%OUTBASE%"

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
set "BACKUPBASE=%SCRIPT_DIR%backup"
set "OUTBASE=%SCRIPT_DIR%output"

if "%~1"=="" goto :help

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
>>"%PS1%"  echo   if($name -match "福山|fukuyama"){ return "福山" }
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

>>"%PS1%"  echo       # 出力ファイル名を固定（運送会社ごと）＋福山だけ txt
>>"%PS1%"  echo       $inExt = $f.Extension
>>"%PS1%"  echo       switch($carrier){
>>"%PS1%"  echo         "西濃"     { $outFile = ("seino"   -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo         "第一貨物" { $outFile = ("daiichi" -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo         "ヤマト"   { $outFile = ("yamato"  -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo         "福山"     { $outFile = ("fukuyama"-f $dateKey); $outExt = ".txt"; break }
>>"%PS1%"  echo         default    { $outFile = ("other_{0}"          -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo       }
>>"%PS1%"  echo       $outPath = Join-Path $outDir ($outFile + $outExt)
>>"%PS1%"  echo.

>>"%PS1%"  echo       # UTF-8で読み込み → ヘッダー1行削除
>>"%PS1%"  echo       $lines = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
>>"%PS1%"  echo       if($lines.Length -le 1){ $outLines = @() } else { $outLines = $lines[1..($lines.Length-1)] }
>>"%PS1%"  echo.

>>"%PS1%"  echo       # ★福山だけ：Trimしない（固定値維持）＋空行(完全空文字)だけ除去＋カンマ削除
>>"%PS1%"  echo       if($carrier -eq "福山"){
>>"%PS1%"  echo         $outLines = $outLines ^| Where-Object { $_ -ne $null -and $_ -ne "" } ^| ForEach-Object { ($_ -replace ",", "") }
>>"%PS1%"  echo       }
>>"%PS1%"  echo.

>>"%PS1%"  echo       # Shift-JISで書き込み（上書き）
>>"%PS1%"  echo       [System.IO.File]::WriteAllLines($outPath, $outLines, $sjis)
>>"%PS1%"  echo.

>>"%PS1%"  echo       # 元ファイルはバックアップへ移動（衝突しないように時刻付き）
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
>>"%PS1%"  echo       $ts = (Get-Date).ToString("yyyyMMdd_HHmmssfff")
>>"%PS1%"  echo       $bakPath = Join-Path $backupDir ($base + "_" + $ts + $inExt)
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

set "BACKUPBASE=%BACKUPBASE%"
set "OUTBASE=%OUTBASE%"

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
set "BACKUPBASE=%SCRIPT_DIR%backup"
set "OUTBASE=%SCRIPT_DIR%output"

if "%~1"=="" goto :help

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
>>"%PS1%"  echo       # ★出力ファイル名を「固定値」にする（運送会社ごと）
>>"%PS1%"  echo       $ext = $f.Extension
>>"%PS1%"  echo       switch($carrier){
>>"%PS1%"  echo         "西濃"     { $outFile = "seinojisseki_{0}"   -f $dateKey; break }
>>"%PS1%"  echo         "第一貨物" { $outFile = "daiichijisseki_{0}" -f $dateKey; break }
>>"%PS1%"  echo         "ヤマト"   { $outFile = "yamatojisseki_{0}"  -f $dateKey; break }
>>"%PS1%"  echo         default    { $outFile = ("other_{0}" -f $dateKey); break }
>>"%PS1%"  echo       }
>>"%PS1%"  echo       $outPath = Join-Path $outDir ($outFile + $ext)
>>"%PS1%"  echo.
>>"%PS1%"  echo       # UTF-8で読み込み → Shift-JISで書き込み（上書き）
>>"%PS1%"  echo       $text = [System.IO.File]::ReadAllText($f.FullName, $utf8)
>>"%PS1%"  echo       [System.IO.File]::WriteAllText($outPath, $text, $sjis)
>>"%PS1%"  echo.
>>"%PS1%"  echo       # 元ファイルはバックアップへ移動（衝突しないように時刻付き）
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
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

set "PS1=%TEMP%\convert_metabase_%RANDOM%%RANDOM%.ps1"

> "%PS1%"  echo $ErrorActionPreference = "Continue"
>>"%PS1%"  echo $utf8 = [System.Text.Encoding]::UTF8
>>"%PS1%"  echo $sjis = [System.Text.Encoding]::GetEncoding("shift_jis")
>>"%PS1%"  echo $backupBase = $env:BACKUPBASE
>>"%PS1%"  echo $outBase    = $env:OUTBASE
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $backupBase ^| Out-Null
>>"%PS1%"  echo New-Item -ItemType Directory -Force -Path $outBase    ^| Out-Null
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
>>"%PS1%"  echo.
>>"%PS1%"  echo       # 日付キーは常に「今日」
>>"%PS1%"  echo       $dateKey = (Get-Date).ToString("yyyyMMdd")
>>"%PS1%"  echo.
>>"%PS1%"  echo       # ディレクトリ構成：yyyymmdd のみ（出力/バックアップ）
>>"%PS1%"  echo       $backupDir = Join-Path $backupBase $dateKey
>>"%PS1%"  echo       $outDir    = Join-Path $outBase    $dateKey
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $backupDir ^| Out-Null
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $outDir    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo       # 出力ファイル名を固定値に（yyyyMMddHHmm）
>>"%PS1%"  echo       $outStamp = (Get-Date).ToString("yyyyMMddHHmmss")  # 例: 202601191237
>>"%PS1%"  echo       $outName  = "TASK-t-sort荷札仕分け_{0}.csv" -f $outStamp
>>"%PS1%"  echo       $outPath  = Join-Path $outDir $outName
>>"%PS1%"  echo.
>>"%PS1%"  echo       # UTF-8で読み込み → 1行目(ヘッダー)削除 → Shift-JISで書き込み
>>"%PS1%"  echo       $lines = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
>>"%PS1%"  echo       if($lines.Length -le 1){ $outLines = @() } else { $outLines = $lines[1..($lines.Length-1)] }
>>"%PS1%"  echo       [System.IO.File]::WriteAllLines($outPath, $outLines, $sjis)
>>"%PS1%"  echo.
>>"%PS1%"  echo       # 元ファイルはバックアップへ移動
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
>>"%PS1%"  echo       $ext  = $f.Extension
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
echo.
echo 使い方: metabase_sjis_noheader.bat
echo   CSVを1つ/複数選択して、このbatにドラッグ＆ドロップ
echo   フォルダをドロップするとその中のCSVを全部処理します
echo.
pause
exit /b 1
```

