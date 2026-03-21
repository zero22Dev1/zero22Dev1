
```bat
@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "LOG_DIR=C:\work\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "LOG_FILE=%LOG_DIR%\job.log"

echo ===========================================>> "%LOG_FILE%"
echo [%date% %time%] JOB START >> "%LOG_FILE%"

rem 今日の日付
for /f %%A in ('"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "Get-Date -Format yyyyMMdd"') do (
    set "TODAY=%%A"
)

rem DBから日付取得
set "DB_DATE="
for /f "usebackq delims=" %%A in (`"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h 127.0.0.1 -P 3306 -uroot -ppassword -N -B -e "SELECT ymd FROM sample_table WHERE id = 1 LIMIT 1;" testdb`) do (
    set "DB_DATE=%%A"
)

echo [%date% %time%] TODAY=!TODAY! >> "%LOG_FILE%"
echo [%date% %time%] DB_DATE=!DB_DATE! >> "%LOG_FILE%"

if not defined DB_DATE (
    echo [%date% %time%] ERROR: DB_DATE not found >> "%LOG_FILE%"
    exit /b 1
)

if "!DB_DATE!"=="!TODAY!" (
    echo [%date% %time%] INFO: date matched. run process. >> "%LOG_FILE%"
    call "C:\work\bat\sub_process.bat" >> "%LOG_FILE%" 2>&1
) else (
    echo [%date% %time%] INFO: date not matched. skip. >> "%LOG_FILE%"
    exit /b 0
)

echo [%date% %time%] JOB END >> "%LOG_FILE%"
endlocal
```
