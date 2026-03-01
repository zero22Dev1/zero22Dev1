```cmd
@echo off
chcp 65001 > nul
setlocal EnableExtensions EnableDelayedExpansion
if "%~1"=="" (
  echo [USAGE] CSVファイルをBATにドラッグアンドドロップしてください
  pause
  exit /b 1
)
set "IN_CSV=%~1"
if not exist "%IN_CSV%" (
  echo [ERROR] ファイルが見つかりません: "%IN_CSV%"
  pause
  exit /b 1
)
set "IN_NAME=%~n1"
echo !IN_NAME! | findstr /i "ANS" >nul
if errorlevel 1 (
  echo [ERROR] ファイル名に "ANS" が含まれていません: "%IN_NAME%"
  pause
  exit /b 1
)
for %%I in ("%IN_CSV%") do set "IN_DIR=%%~dpI"
set "OUT_DIR=%IN_DIR%output"
set "BKP_BASE=%IN_DIR%backup"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"') do set "YMD=%%i"
if "%YMD%"=="" (
  echo [ERROR] 日付の取得に失敗しました
  pause
  exit /b 1
)
set "OUT_NAME=ANS_%YMD%.csv"
set "OUT_PATH=%OUT_DIR%\%OUT_NAME%"
set "BKP_DIR=%BKP_BASE%\%YMD%"
set "BKP_PATH=%BKP_DIR%\%OUT_NAME%"
if exist "%OUT_PATH%" (
  echo [WARN] 出力ファイルが既に存在します: "%OUT_PATH%"
  set /p "YESNO=上書きしますか？ [Y/N]: "
  if /i not "!YESNO!"=="Y" (
    echo [INFO] キャンセルしました
    pause
    exit /b 0
  )
)
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"
if not exist "%BKP_DIR%" mkdir "%BKP_DIR%"
set "CONV_IN=%IN_CSV%"
set "CONV_OUT=%OUT_PATH%"
set "CONV_BKP=%BKP_PATH%"
set "TMP_PS=%TEMP%\conv_%RANDOM%.ps1"
(
  echo $ErrorActionPreference = 'Stop'
  echo $in  = $env:CONV_IN
  echo $out = $env:CONV_OUT
  echo $bkp = $env:CONV_BKP
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
  echo [ERROR] 変換に失敗しました code=%RC%
  pause
  exit /b %RC%
)
del /f /q "%IN_CSV%"
if exist "%IN_CSV%" (
  echo [WARN] 入力CSVの削除に失敗しました
  pause
  exit /b 2
)
echo [OK] output: "%OUT_PATH%"
echo [OK] backup: "%BKP_PATH%"
pause
exit /b 0

```
