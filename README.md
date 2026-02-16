# Convert-MetabaseCsv.bat

Metabaseから出力したCSVを、**運送会社ごと**に仕分けして **Shift-JIS** に変換し、出力＆バックアップします。

---

## 仕様

- 入力: **UTF-8**
- 変換: **ヘッダー1行目を削除**
- 出力: **Shift-JIS**
- 出力先: `output\<運送会社>\<yyyymmdd>\ <固定名><拡張子>`
- バックアップ先: `backup\<運送会社>\<yyyymmdd>\ <元名>_<yyyyMMdd_HHmmssfff><元拡張子>`

### 運送会社判定（ファイル名で判定）
- ヤマト: `ヤマト` / `yamato`
- 西濃: `西濃` / `seino`
- 第一貨物: `第一貨物` / `だいいち` / `daiichi`
- 福山: `福山` / `fukuyama`
- それ以外: `other`

### 出力ファイル名（固定）
- 西濃: `SEINO_yyyymmdd` + 元拡張子（例: `.csv`）
- 第一貨物: `daiichi` + 元拡張子
- ヤマト: `yamato` + 元拡張子
- 福山: `fukutsu.txt`（拡張子は **.txt 固定**）

### 福山だけ追加処理
- **空行（完全空文字）を除去**
- **カンマ削除（行内のカンマを全削除）**
- Trimはしない（固定長など想定）

---

## 使い方

- CSV（複数OK）を **このbatへドラッグ＆ドロップ**
- フォルダをドロップすると **中の `*.csv` を全処理**

---

## スクリプト

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
>>"%PS1%"  echo         "西濃" { $outFile = ("SEINO_{0}" -f $dateKey).ToUpper(); $outExt = $inExt; break }
>>"%PS1%"  echo         "第一貨物" { $outFile = ("daiichi" -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo         "ヤマト"   { $outFile = ("yamato"  -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo         "福山"     { $outFile = ("fukutsu"-f $dateKey); $outExt = ".txt"; break }
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

# Convert-MetabaseCsv.bat（福山：外側の`'`剥がし＋空文字除去版）

MetabaseのCSVを運送会社ごとに仕分けし、**UTF-8 →（ヘッダー削除）→ Shift-JIS** で出力します。  
福山のみ追加で **外側の`'`を剥がす / カンマ削除 / 完全空文字だけ除去（空白のみは残す）** を行います。

---

## 仕様

### 入出力
- 入力: UTF-8
- 変換: ヘッダー（1行目）削除
- 出力: Shift-JIS

### 出力/バックアップ先
- 出力: `output\<運送会社>\<yyyymmdd>\ <固定名><拡張子>`
- バックアップ: `backup\<運送会社>\<yyyymmdd>\ <元名>_<yyyyMMdd_HHmmssfff><元拡張子>`

### 運送会社判定（ファイル名で判定）
- ヤマト: `ヤマト` / `yamato`
- 西濃: `西濃` / `seino`
- 第一貨物: `第一貨物` / `だいいち` / `daiichi`
- 福山: `福山` / `fukuyama`
- それ以外: `other`

### 出力ファイル名（固定）
- 西濃: `SEINO_yyyymmdd`（大文字化）＋元拡張子
- 第一貨物: `daiichi` ＋元拡張子
- ヤマト: `yamato` ＋元拡張子
- 福山: `fukutsu.txt`（拡張子は **.txt 固定**）
- other: `other_yyyymmdd` ＋元拡張子

### 福山だけ追加処理
- **Trimしない（固定値維持）**
- **空白だけの行は残す（`'   '`なども残る）**
- **完全空文字だけ除去**
- **外側の`'`だけ剥がす**（先頭と末尾が`'`のとき）
- **カンマ削除**（行内の`,`をすべて削除）

---

## 使い方

- CSV（複数OK）をこのbatへドラッグ＆ドロップ
- フォルダをドロップすると中の `*.csv` を全処理

---

## スクリプト

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
>>"%PS1%"  echo         "西濃" { $outFile = ("SEINO_{0}" -f $dateKey).ToUpper(); $outExt = $inExt; break }
>>"%PS1%"  echo         "第一貨物" { $outFile = ("daiichi" -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo         "ヤマト"   { $outFile = ("yamato"  -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo         "福山"     { $outFile = ("fukutsu"-f $dateKey); $outExt = ".txt"; break }
>>"%PS1%"  echo         default    { $outFile = ("other_{0}"          -f $dateKey); $outExt = $inExt; break }
>>"%PS1%"  echo       }
>>"%PS1%"  echo       $outPath = Join-Path $outDir ($outFile + $outExt)
>>"%PS1%"  echo.
>>"%PS1%"  echo       # UTF-8で読み込み → ヘッダー1行削除
>>"%PS1%"  echo       $lines = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
>>"%PS1%"  echo       if($lines.Length -le 1){ $outLines = @() } else { $outLines = $lines[1..($lines.Length-1)] }
>>"%PS1%"  echo.
>>"%PS1%"  echo       # ★福山だけ：Trimしない（固定値維持）＋空白のみは残す／完全空文字だけ除去＋外側の'を剥がす＋カンマ削除
>>"%PS1%"  echo       if($carrier -eq "福山"){
>>"%PS1%"  echo         $outLines = $outLines ^|
>>"%PS1%"  echo           Where-Object { $_ -ne $null } ^|
>>"%PS1%"  echo           ForEach-Object {
>>"%PS1%"  echo             $s = $_
>>"%PS1%"  echo             if($s.Length -ge 2 -and $s[0] -eq '''' -and $s[$s.Length-1] -eq ''''){ $s = $s.Substring(1, $s.Length-2) }
>>"%PS1%"  echo             $s = $s -replace ',', ''
>>"%PS1%"  echo             if($s -eq ''){ $null } else { $s }
>>"%PS1%"  echo           } ^|
>>"%PS1%"  echo           Where-Object { $_ -ne $null }
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

set "BACKUPBASE=%BACKUPBASE%"
set "OUTBASE=%OUTBASE%"

set "PS1=%TEMP%\convert_metabase_%RANDOM%%RANDOM%.ps1"

> "%PS1%"  echo $ErrorActionPreference = "Continue"
>>"%PS1%"  echo $utf8 = [System.Text.Encoding]::UTF8
>>"%PS1%"  echo $sjis = [System.Text.Encoding]::GetEncoding("shift_jis")
>>"%PS1%"  echo.
>>"%PS1%"  echo # ---- Build Japanese carrier names from Unicode to avoid garbling ----
>>"%PS1%"  echo $seinoJp = [string]::Concat([char]0x897F,[char]0x6FC3)                                       # 西濃
>>"%PS1%"  echo $seinoUnyu = [string]::Concat([char]0x897F,[char]0x6FC3,[char]0x904B,[char]0x8F38)           # 西濃運輸
>>"%PS1%"  echo $seinoKana = [string]::Concat([char]0x30BB,[char]0x30A4,[char]0x30CE,[char]0x30FC)           # セイノー
>>"%PS1%"  echo.
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
>>"%PS1%"  echo   # 西濃（表記揺れ吸収：西濃運輸/セイノー/SEINO など）
>>"%PS1%"  echo   if($name -match $seinoUnyu -or $name -match $seinoJp -or $name -match $seinoKana -or $name -match "seino"){ return $seinoJp }
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
>>"%PS1%"  echo       Write-Host ("FILE: " + $f.Name + "  carrier=" + $carrier + "  dateKey=" + $dateKey)
>>"%PS1%"  echo.
>>"%PS1%"  echo       if($carrier -eq "other"){
>>"%PS1%"  echo         Write-Warning ("Skipped (carrier=other): " + $f.Name)
>>"%PS1%"  echo         continue
>>"%PS1%"  echo       }
>>"%PS1%"  echo.
>>"%PS1%"  echo       $backupDir = Join-Path (Join-Path $backupBaseRoot $carrier) $dateKey
>>"%PS1%"  echo       $outDir    = Join-Path (Join-Path $outBaseRoot    $carrier) $dateKey
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $backupDir ^| Out-Null
>>"%PS1%"  echo       New-Item -ItemType Directory -Force -Path $outDir    ^| Out-Null
>>"%PS1%"  echo.
>>"%PS1%"  echo       $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
>>"%PS1%"  echo       $ext  = $f.Extension
>>"%PS1%"  echo.
>>"%PS1%"  echo       $lines = [System.IO.File]::ReadAllLines($f.FullName, $utf8)
>>"%PS1%"  echo       $body  = Remove-Header $lines
>>"%PS1%"  echo       Write-Host ("  lines(all)=" + $lines.Length + "  lines(body)=" + $body.Length)
>>"%PS1%"  echo.
>>"%PS1%"  echo       if($carrier -eq $fukuJp){
>>"%PS1%"  echo         # 福山：TSV化して txt（Shift-JIS）／出力名は fukutsu.txt 固定
>>"%PS1%"  echo         $tsvLines = CsvToTsvLines $body
>>"%PS1%"  echo         $outPath = Join-Path $outDir "fukutsu.txt"
>>"%PS1%"  echo         [System.IO.File]::WriteAllLines($outPath, $tsvLines, $sjis)
>>"%PS1%"  echo       } elseif($carrier -eq $seinoJp){
>>"%PS1%"  echo         # 西濃：Shift-JIS（拡張子そのまま）／出力名は SEINO_yyyymmdd 固定
>>"%PS1%"  echo         $outPath = Join-Path $outDir ("SEINO_" + $dateKey + $ext)
>>"%PS1%"  echo         [System.IO.File]::WriteAllLines($outPath, $body, $sjis)
>>"%PS1%"  echo       }
>>"%PS1%"  echo       Write-Host ("  outPath=" + $outPath)
>>"%PS1%"  echo.
>>"%PS1%"  echo       $ts2 = (Get-Date).ToString("yyyyMMdd_HHmmssfff")
>>"%PS1%"  echo       $bakPath = Join-Path $backupDir ($base + "_" + $ts2 + $ext)
>>"%PS1%"  echo       Move-Item -LiteralPath $f.FullName -Destination $bakPath -Force
>>"%PS1%"  echo.
>>"%PS1%"  echo       $processed++
>>"%PS1%"  echo       Write-Host ("OK: " + $f.Name)
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
>>"%PS1%"  echo       if($carrier -eq "other"){
>>"%PS1%"  echo         Write-Warning ("Skipped (carrier=other): " + $f.Name)
>>"%PS1%"  echo         continue
>>"%PS1%"  echo       }
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
>>"%PS1%"  echo         # 福山：TSV化して txt（Shift-JIS）／出力名は fukutsu.txt 固定（同一フォルダでは上書き）
>>"%PS1%"  echo         $tsvLines = CsvToTsvLines $body
>>"%PS1%"  echo         $outPath = Join-Path $outDir "fukutsu.txt"
>>"%PS1%"  echo         [System.IO.File]::WriteAllLines($outPath, $tsvLines, $sjis)
>>"%PS1%"  echo       } elseif($carrier -eq $seinoJp){
>>"%PS1%"  echo         # 西濃：Shift-JIS（拡張子そのまま）／出力名は SEINO_yyyymmdd 固定（同一フォルダでは上書き）
>>"%PS1%"  echo         $outPath = Join-Path $outDir ("SEINO_" + $dateKey + $ext)
>>"%PS1%"  echo         [System.IO.File]::WriteAllLines($outPath, $body, $sjis)
>>"%PS1%"  echo       }
>>"%PS1%"  echo.
>>"%PS1%"  echo       # 元ファイルはバックアップへ移動
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







ここからは違うやつ


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

