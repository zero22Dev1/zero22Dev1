'''bat
@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==========================
REM Drag&Drop CSV UTF-8 -> Shift-JIS Converter
REM 入力: *.csv
REM 出力: ANS_yyyymmdd.csv （.csv固定）
REM ==========================

REM ★固定値（指定どおり）
set "FIXED_PREFIX=ANS"

REM 出力先（空なら入力ファイルと同じフォルダ）
set "OUTDIR="

if "%~1"=="" (
  echo このbatにCSVファイルをドラッグ＆ドロップしてください。
  pause
  exit /b 1
)

REM yyyymmdd を取得
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"') do set "YYYYMMDD=%%i"

REM 複数ファイルのドラッグ＆ドロップ対応
for %%F in (%*) do (
  set "INFILE=%%~fF"
  set "EXT=%%~xF"

  REM .csv以外はスキップ
  if /I not "!EXT!"==".csv" (
    echo [SKIP] CSV以外: !INFILE!
    goto :continue
  )

  REM 出力パス（拡張子は必ず .csv）
  if not defined OUTDIR (
    set "OUT=%%~dpF%FIXED_PREFIX%_%YYYYMMDD%.csv"
  ) else (
    if not exist "%OUTDIR%" mkdir "%OUTDIR%" >nul 2>&1
    set "OUT=%OUTDIR%\%FIXED_PREFIX%_%YYYYMMDD%.csv"
  )

  REM UTF-8 -> Shift-JIS（BOM付きUTF-8も読める）
  powershell -NoProfile -Command ^
    "$in='!INFILE!'; $out='!OUT!';" ^
    "$utf8 = New-Object System.Text.UTF8Encoding($true);" ^
    "$sjis = [System.Text.Encoding]::GetEncoding('shift_jis');" ^
    "$text = [System.IO.File]::ReadAllText($in, $utf8);" ^
    "[System.IO.File]::WriteAllText($out, $text, $sjis);"

  if errorlevel 1 (
    echo [ERROR] 変換失敗: !INFILE!
    exit /b 1
  ) else (
    echo [OK] !OUT!
  )

  :continue
)

pause
exit /b 0

'''