```bat
@echo off
setlocal

:: =========================================
:: MySQL 8.4 ポート変更＋再起動バッチ
:: Usage:
::   change_mysql84_port_and_restart.bat <NEW_PORT>
::
:: 例:
::   change_mysql84_port_and_restart.bat 3307
:: =========================================

if "%~1"=="" (
  echo [ERROR] 新しいポート番号を指定してください。
  echo 例: change_mysql84_port_and_restart.bat 3307
  exit /b 1
)

set "NEW_PORT=%~1"
set "MYINI=C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
set "SERVICE_NAME=MySQL@8.4"

if not exist "%MYINI%" (
  echo [ERROR] my.ini が見つかりません: %MYINI%
  exit /b 2
)

echo [STEP] MySQLサービスを停止します...
net stop "%SERVICE_NAME%"
if errorlevel 1 (
  echo [WARN] サービス停止に失敗（すでに停止中かも）。
)

:: ---- バックアップ作成 ----
set "BACKUP=%MYINI%.bak_%DATE:~-4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%"
set "BACKUP=%BACKUP: =0%"
copy "%MYINI%" "%BACKUP%" >nul
echo [INFO] バックアップ作成: %BACKUP%

:: ---- ポート設定変更（PowerShell使用）----
echo [STEP] my.ini のポート番号を %NEW_PORT% に変更します...
powershell -NoProfile -ExecutionPolicy Bypass ^
  -Command ^
  "$ini='%MYINI%';" ^
  "$text=Get-Content -Raw -Encoding UTF8 $ini;" ^
  "if ($text -match '(?m)^port\s*=\s*\d+') {" ^
  "  $text -replace '(?m)^port\s*=\s*\d+', 'port=%NEW_PORT%' | Set-Content -Encoding UTF8 $ini" ^
  "} elseif ($text -match '(?m)^\[mysqld\]') {" ^
  "  $text -replace '(?m)(^\[mysqld\]\s*)', '`$1`r`nport=%NEW_PORT%`r`n' | Set-Content -Encoding UTF8 $ini" ^
  "} else {" ^
  "  Add-Content -Encoding UTF8 $ini '`r`n[mysqld]`r`nport=%NEW_PORT%'" ^
  "}"

if errorlevel 1 (
  echo [ERROR] ポート変更に失敗しました。
  exit /b 3
)

echo [STEP] MySQLサービスを起動します...
net start "%SERVICE_NAME%"
if errorlevel 1 (
  echo [ERROR] サービス起動に失敗しました。services.msc で確認してください。
  exit /b 4
)

echo.
echo [SUCCESS] MySQL 8.4 のポート番号を %NEW_PORT% に変更し、再起動しました。
echo [INFO] 接続確認コマンド例: mysql -u root -p -P %NEW_PORT%
pause
```