```cmd
@echo off
setlocal EnableExtensions EnableDelayedExpansion
if "%~1"=="" (
  echo [USAGE] CSVをこのBATにドラッグアンドドロップしてください
  pause
  exit /b 1
)
set "IN_CSV=%~1"
if not exist "%IN_CSV%" (
  echo [ERROR] Input not found: "%IN_CSV%"
  pause
  exit /b 1
)
for %%I in ("%IN_CSV%") do set "IN_DIR=%%~dpI"
set "OUT_DIR=%IN_DIR%output"
set "BKP_BASE=%IN_DIR%backup"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"') do set "YMD=%%i"
if "%YMD%"=="" (
  echo [ERROR] 日付取得失敗
  pause
  exit /b 1
)
set "OUT_NAME=ANS_%YMD%.csv"
set "OUT_PATH=%OUT_DIR%\%OUT_NAME%"
set "BKP_DIR=%BKP_BASE%\%YMD%"
set "BKP_PATH=%BKP_DIR%\%OUT_NAME%"
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"
if not exist "%BKP_DIR%" mkdir "%BKP_DIR%"
set "TMP_PS=%TEMP%\conv_%RANDOM%.ps1"
set "IN2=%IN_CSV:\=\\%"
set "OUT2=%OUT_PATH:\=\\%"
set "BKP2=%BKP_PATH:\=\\%"
(
  echo $ErrorActionPreference = 'Stop'
  echo $in  = '%IN2%'
  echo $out = '%OUT2%'
  echo $bkp = '%BKP2%'
  echo $utf8 = New-Object System.Text.UTF8Encoding($false^)
  echo $sjis = [System.Text.Encoding]::GetEncoding('shift_jis'^)
  echo try { $txt = [System.IO.File]::ReadAllText($in,$utf8^) } catch { $txt = [System.IO.File]::ReadAllText($in,$sjis^) }
  echo [System.IO.File]::WriteAllText($out,$txt,$sjis^)
  echo [System.IO.File]::WriteAllText($bkp,$txt,$utf8^)
) > "%TMP_PS%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%TMP_PS%"
set "RC=%ERRORLEVEL%"
del /f /q "%TMP_PS%"
if not "%RC%"=="0" (
  echo [ERROR] 変換失敗 code=%RC%
  pause
  exit /b %RC%
)
del /f /q "%IN_CSV%"
if exist "%IN_CSV%" (
  echo [WARN] 元CSVを削除できませんでした
  pause
  exit /b 2
)
echo [OK] output: "%OUT_PATH%"
echo [OK] backup: "%BKP_PATH%"
pause
exit /b 0
```
