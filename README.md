
```sql

SELECT
  CASE
    WHEN LEFT(col, 1) = '/' THEN NULL
    ELSE SUBSTRING_INDEX(col, '/', 1)
  END AS result
FROM (
  SELECT 'aaaa/ddddd' AS col
  UNION ALL
  SELECT '/aaaaa'
) t;


UPDATE employees e
SET 
  e.salary = (
    SELECT AVG(e2.salary)
    FROM employees e2 
    WHERE e2.department_id = e.department_id
  ),
  e.def = (
    SELECT di.default_value
    FROM dept_info di
    WHERE di.department_id = e.department_id
    LIMIT 1
  )
WHERE e.department_id = (
  SELECT d.id 
  FROM departments d 
  WHERE d.code = 'DEV'
  LIMIT 1
);
```




```cmd
netsh winhttp show proxy
```


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

```bat
@echo off
setlocal

:: =========================================
:: MySQL 8.0 ポート変更＋再起動バッチ（Windows）
:: Usage:
::   change_mysql80_port_and_restart.bat <NEW_PORT> [MYINI_PATH] [SERVICE_NAME]
::
:: 例:
::   change_mysql80_port_and_restart.bat 3307
::   change_mysql80_port_and_restart.bat 13306 "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" "MySQL80"
:: =========================================

if "%~1"=="" (
  echo [ERROR] 新しいポート番号を指定してください。
  echo 例: change_mysql80_port_and_restart.bat 3307
  exit /b 1
)

set "NEW_PORT=%~1"

:: ---- my.ini を引数優先で決定（なければ代表パスを探索）----
set "MYINI=%~2"
if "%MYINI%"=="" (
  for %%P in (
    "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
    "C:\Program Files\MySQL\MySQL Server 8.0\my.ini"
    "C:\mysql\my.ini"
  ) do (
    if exist %%~P ( set "MYINI=%%~P" & goto :INI_FOUND )
  )
  :INI_FOUND
)

if not exist "%MYINI%" (
  echo [ERROR] my.ini が見つかりません。第2引数でパスを指定してください。
  echo  例: change_mysql80_port_and_restart.bat 3307 "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
  exit /b 2
)

:: ---- サービス名を決定（引数優先→候補から自動検出）----
set "SERVICE_NAME=%~3"
if "%SERVICE_NAME%"=="" (
  for %%S in ("MySQL80" "MySQL" "mysql80" "mysql") do (
    sc query "%%~S" >nul 2>&1 && ( set "SERVICE_NAME=%%~S" & goto :SVC_FOUND )
  )
  :SVC_FOUND
)

echo [INFO] 使用する my.ini: %MYINI%
if "%SERVICE_NAME%"=="" (
  echo [WARN] MySQLサービス名が見つかりません。後で手動で起動してください。
) else (
  echo [INFO] 使用するサービス名: %SERVICE_NAME%
)

:: ---- サービス停止 ----
if not "%SERVICE_NAME%"=="" (
  echo [STEP] サービス停止中...
  net stop "%SERVICE_NAME%"
  if errorlevel 1 (
    echo [WARN] サービス停止に失敗（既に停止中の可能性）。
  )
)

:: ---- バックアップ作成 ----
set "YMD=%date:~-4%%date:~4,2%%date:~7,2%"
set "HMS=%time: =0%"
set "HMS=%HMS::=%"
set "BACKUP=%MYINI%.bak_%YMD%_%HMS%"
copy "%MYINI%" "%BACKUP%" >nul
if errorlevel 1 (
  echo [ERROR] my.ini バックアップに失敗: %BACKUP%
  exit /b 3
) else (
  echo [INFO] バックアップ作成: %BACKUP%
)

:: ---- ポート設定を更新/追記（PowerShellで安全に処理）----
echo [STEP] my.ini のポート番号を %NEW_PORT% に変更します...
powershell -NoProfile -ExecutionPolicy Bypass ^
  -Command ^
  "$ini='%MYINI%';" ^
  "$text=Get-Content -Raw -Encoding UTF8 $ini;" ^
  "$lines=$text -split \"`r?`n\";" ^
  "$out=New-Object System.Collections.Generic.List[string];" ^
  "$inMy=$false; $done=$false;" ^
  "for($i=0;$i -lt $lines.Count;$i++){" ^
  "  $line=$lines[$i];" ^
  "  if($line -match '^\s*\[mysqld\]\s*$'){ $inMy=$true; $out.Add($line); continue }" ^
  "  if($inMy -and $line -match '^\s*\['){ if(-not $done){ $out.Add('port=%NEW_PORT%'); $done=$true } ; $inMy=$false }" ^
  "  if($inMy -and $line -match '^\s*port\s*=\s*\d+\s*$'){ $out.Add('port=%NEW_PORT%'); $done=$true; continue }" ^
  "  $out.Add($line)" ^
  "}" ^
  "if(-not $done){" ^
  "  if($lines -match '^\s*\[mysqld\]\s*$'){" ^
  "    $out.Add('port=%NEW_PORT%')" ^
  "  } else {" ^
  "    if($out.Count -gt 0 -and $out[-1] -ne ''){ $out.Add('') }" ^
  "    $out.Add('[mysqld]'); $out.Add('port=%NEW_PORT%')" ^
  "  }" ^
  "}" ^
  "$out -join \"`r`n\" | Set-Content -Encoding UTF8 $ini;"

if errorlevel 1 (
  echo [ERROR] ポート変更に失敗しました。
  exit /b 4
)

:: ---- サービス起動 ----
if not "%SERVICE_NAME%"=="" (
  echo [STEP] サービス起動中...
  net start "%SERVICE_NAME%"
  if errorlevel 1 (
    echo [ERROR] サービス起動に失敗。services.msc で確認してください。
    exit /b 5
  )
)

echo.
echo [SUCCESS] MySQL 8.0 のポート番号を %NEW_PORT% に変更し、再起動しました。
echo [INFO] 接続確認例:  mysql -u root -p -P %NEW_PORT%
exit /b 0
```
```cmd
change_mysql80_port_and_restart.bat 3307
```

