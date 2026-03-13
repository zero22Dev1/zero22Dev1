
Sub ExportCSV_SJIS()
    Dim stream As Object
    Set stream = CreateObject("ADODB.Stream")
    
    stream.Type = 2
    stream.Charset = "Shift_JIS"
    stream.Open
    
    Dim ws As Worksheet
    Set ws = Sheets("Sheet1")  ' ← シート名を変更してください
    
    Dim lastRow As Long
    Dim lastCol As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    
    Dim i As Long, j As Long
    For i = 1 To lastRow
        Dim cols() As String
        ReDim cols(lastCol - 1)
        
        For j = 1 To lastCol
            cols(j - 1) = CStr(ws.Cells(i, j).Value)
        Next j
        
        stream.WriteText Join(cols, ",") & vbCrLf
    Next i
    
    stream.SaveToFile "C:\output\data.csv", 2
    stream.Close
    Set stream = Nothing
    
    MsgBox "CSV出力完了"
End Sub







```bat
@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ============================================
rem 色定義（ANSI）
rem ============================================
for /f %%A in ('powershell -NoProfile -Command "[char]27"') do set "ESC=%%A"
set "RED=%ESC%[31m"
set "YELLOW=%ESC%[33m"
set "RESET=%ESC%[0m"

rem ============================================
rem .env 読み込み
rem ============================================
set "ENV_FILE=.env"

if not exist "%ENV_FILE%" (
  echo [ERROR] .env が存在しません: %ENV_FILE%
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  if not "%%A"=="" (
    set "K=%%A"
    set "V=%%B"
    if not "!K:~0,1!"=="#" set "!K!=!V!"
  )
)

if "%BACKUP_BASE_DIR%"=="" set "BACKUP_BASE_DIR=C:\work\backup"
if "%LOG_DIR%"=="" set "LOG_DIR=C:\work\logs"
if "%MYSQL_EXE%"=="" set "MYSQL_EXE=mysql"
if "%MYSQLDUMP_EXE%"=="" set "MYSQLDUMP_EXE=mysqldump"

rem ============================================
rem 日時生成
rem ============================================
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
if "%TS%"=="" set "TS=NO_TIMESTAMP"

if not exist "%BACKUP_BASE_DIR%" mkdir "%BACKUP_BASE_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "LOG_FILE=%LOG_DIR%\import_%TS%.log"

echo ============================================ > "%LOG_FILE%"
echo START : %DATE% %TIME% >> "%LOG_FILE%"
echo ENV   : %ENV_FILE% >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"

rem ============================================
rem SQLファイル選択ダイアログ
rem ============================================
echo.
echo ===== インポートするSQLファイルを選択してください =====

for /f "delims=" %%I in ('powershell -NoProfile -Command ^
  "Add-Type -AssemblyName System.Windows.Forms; ^
   $f = New-Object System.Windows.Forms.OpenFileDialog; ^
   $f.Title = 'インポートするSQLファイルを選択してください'; ^
   $f.Filter = 'SQL files (*.sql)|*.sql|All files (*.*)|*.*'; ^
   $f.Multiselect = $false; ^
   if($f.ShowDialog() -eq 'OK'){ $f.FileName }"') do set "DUMP_FILE=%%I"

if "%DUMP_FILE%"=="" (
  echo [ERROR] SQLファイルが選択されませんでした
  echo [ERROR] SQLファイルが選択されませんでした >> "%LOG_FILE%"
  exit /b 1
)

if not exist "%DUMP_FILE%" (
  echo [ERROR] 選択されたSQLファイルが存在しません: %DUMP_FILE%
  echo [ERROR] 選択されたSQLファイルが存在しません: %DUMP_FILE% >> "%LOG_FILE%"
  exit /b 1
)

echo %DUMP_FILE% | findstr /I "\.sql$" >nul
if errorlevel 1 (
  echo [ERROR] .sqlファイルではありません
  echo [ERROR] .sqlファイルではありません >> "%LOG_FILE%"
  exit /b 1
)

echo [INFO] 対象SQL: %DUMP_FILE%
echo [INFO] 対象SQL: %DUMP_FILE% >> "%LOG_FILE%"

rem ============================================
rem 接続情報入力
rem ============================================
echo.
echo ===== 接続情報を入力してください =====
set /p DB_HOST=DB_HOST:
set /p DB_PORT=DB_PORT:
set /p DB_NAME=DB_NAME(スキーマ名):
set /p DB_USER=DB_USER:
set /p DB_PASS=DB_PASS:

if "%DB_HOST%"=="" (
  echo [ERROR] DB_HOSTが未入力です
  echo [ERROR] DB_HOSTが未入力です >> "%LOG_FILE%"
  exit /b 1
)
if "%DB_PORT%"=="" (
  echo [ERROR] DB_PORTが未入力です
  echo [ERROR] DB_PORTが未入力です >> "%LOG_FILE%"
  exit /b 1
)
if "%DB_NAME%"=="" (
  echo [ERROR] DB_NAMEが未入力です
  echo [ERROR] DB_NAMEが未入力です >> "%LOG_FILE%"
  exit /b 1
)
if "%DB_USER%"=="" (
  echo [ERROR] DB_USERが未入力です
  echo [ERROR] DB_USERが未入力です >> "%LOG_FILE%"
  exit /b 1
)
if "%DB_PASS%"=="" (
  echo [ERROR] DB_PASSが未入力です
  echo [ERROR] DB_PASSが未入力です >> "%LOG_FILE%"
  exit /b 1
)

echo %DB_PORT% | findstr /R "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo [ERROR] DB_PORTは数字で入力してください
  echo [ERROR] DB_PORTは数字で入力してください >> "%LOG_FILE%"
  exit /b 1
)

rem ============================================
rem 実行禁止ホスト/IPチェック
rem ============================================
for /L %%N in (1,1,99) do (
  call set "DENY_VAL=%%DENY_TARGET_%%N%%"
  if defined DENY_VAL (
    if /I "%DB_HOST%"=="!DENY_VAL!" (
      echo [ERROR] 使用禁止の接続先です: %DB_HOST%
      echo [ERROR] 使用禁止の接続先です: %DB_HOST% >> "%LOG_FILE%"
      exit /b 1
    )
  )
)

rem ============================================
rem 本番環境っぽいか判定
rem ============================================
set "IS_PROD=0"
for /L %%N in (1,1,20) do (
  call set "PROD_VAL=%%PROD_KEYWORD_%%N%%"
  if defined PROD_VAL (
    echo %DB_HOST% | findstr /I "!PROD_VAL!" >nul
    if not errorlevel 1 set "IS_PROD=1"
  )
)

rem ============================================
rem バックアップ先
rem ============================================
set "BACKUP_DIR=%BACKUP_BASE_DIR%\%DB_NAME%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
set "BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_backup_%TS%.sql"

echo HOST  : %DB_HOST% >> "%LOG_FILE%"
echo PORT  : %DB_PORT% >> "%LOG_FILE%"
echo DB    : %DB_NAME% >> "%LOG_FILE%"
echo USER  : %DB_USER% >> "%LOG_FILE%"
echo SQL   : %DUMP_FILE% >> "%LOG_FILE%"
echo BKP   : %BACKUP_FILE% >> "%LOG_FILE%"
echo LOG   : %LOG_FILE% >> "%LOG_FILE%"

rem ============================================
rem 入力内容確認表示
rem ============================================
echo.
echo ============================================================
echo =============== %RED%!!! 実行対象の確認 !!!%RESET% ===============
echo ============================================================
echo.
echo   HOST : %RED%%DB_HOST%%RESET%
echo   PORT : %RED%%DB_PORT%%RESET%
echo   DB   : %RED%%DB_NAME%%RESET%
echo   USER : %RED%%DB_USER%%RESET%
echo   PASS : %RED%********%RESET%
echo.
echo   SQL  : %YELLOW%%DUMP_FILE%%RESET%
echo   BKP  : %YELLOW%%BACKUP_FILE%%RESET%
echo   LOG  : %YELLOW%%LOG_FILE%%RESET%
echo.
echo ============================================================
echo %RED%!!! 手入力した接続先を必ず確認してください !!!%RESET%
echo ============================================================

rem ============================================
rem 確認1: HOST再入力
rem ============================================
:RETYPE_DBHOST
echo.
echo [確認1] DB_HOST を再入力してください
echo 対象DB_HOST : %RED%%DB_HOST%%RESET%
set "DB_HOST_CONFIRM="
set /p DB_HOST_CONFIRM=確認用DB_HOST:
if "%DB_HOST_CONFIRM%"=="" (
  echo [ERROR] 確認用DB_HOSTが未入力です
  echo [ERROR] 確認用DB_HOSTが未入力です >> "%LOG_FILE%"
  goto :RETYPE_DBHOST
)
if /I not "%DB_HOST_CONFIRM%"=="%DB_HOST%" (
  echo [ERROR] DB_HOSTが一致しません
  echo [ERROR] DB_HOST不一致 入力=%DB_HOST_CONFIRM% 期待=%DB_HOST% >> "%LOG_FILE%"
  goto :RETYPE_DBHOST
)

rem ============================================
rem 確認2: PORT再入力
rem ============================================
:RETYPE_DBPORT
echo.
echo [確認2] DB_PORT を再入力してください
echo 対象DB_PORT : %RED%%DB_PORT%%RESET%
set "DB_PORT_CONFIRM="
set /p DB_PORT_CONFIRM=確認用DB_PORT:
if "%DB_PORT_CONFIRM%"=="" (
  echo [ERROR] 確認用DB_PORTが未入力です
  echo [ERROR] 確認用DB_PORTが未入力です >> "%LOG_FILE%"
  goto :RETYPE_DBPORT
)
echo %DB_PORT_CONFIRM% | findstr /R "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo [ERROR] 確認用DB_PORTは数字で入力してください
  echo [ERROR] 確認用DB_PORTは数字ではありません: %DB_PORT_CONFIRM% >> "%LOG_FILE%"
  goto :RETYPE_DBPORT
)
if not "%DB_PORT_CONFIRM%"=="%DB_PORT%" (
  echo [ERROR] DB_PORTが一致しません
  echo [ERROR] DB_PORT不一致 入力=%DB_PORT_CONFIRM% 期待=%DB_PORT% >> "%LOG_FILE%"
  goto :RETYPE_DBPORT
)

rem ============================================
rem 確認3: DB_NAME再入力
rem ============================================
:RETYPE_DBNAME
echo.
echo [確認3] スキーマ名を再入力してください
echo 対象スキーマ : %RED%%DB_NAME%%RESET%
set "DB_NAME_CONFIRM="
set /p DB_NAME_CONFIRM=確認用DB_NAME:
if "%DB_NAME_CONFIRM%"=="" (
  echo [ERROR] 確認用DB_NAMEが未入力です
  echo [ERROR] 確認用DB_NAMEが未入力です >> "%LOG_FILE%"
  goto :RETYPE_DBNAME
)
if /I not "%DB_NAME_CONFIRM%"=="%DB_NAME%" (
  echo [ERROR] DB_NAMEが一致しません
  echo [ERROR] DB_NAME不一致 入力=%DB_NAME_CONFIRM% 期待=%DB_NAME% >> "%LOG_FILE%"
  goto :RETYPE_DBNAME
)

rem ============================================
rem 確認4: DB_USER再入力
rem ============================================
:RETYPE_DBUSER
echo.
echo [確認4] DB_USER を再入力してください
echo 対象DB_USER : %RED%%DB_USER%%RESET%
set "DB_USER_CONFIRM="
set /p DB_USER_CONFIRM=確認用DB_USER:
if "%DB_USER_CONFIRM%"=="" (
  echo [ERROR] 確認用DB_USERが未入力です
  echo [ERROR] 確認用DB_USERが未入力です >> "%LOG_FILE%"
  goto :RETYPE_DBUSER
)
if /I not "%DB_USER_CONFIRM%"=="%DB_USER%" (
  echo [ERROR] DB_USERが一致しません
  echo [ERROR] DB_USER不一致 入力=%DB_USER_CONFIRM% 期待=%DB_USER% >> "%LOG_FILE%"
  goto :RETYPE_DBUSER
)

rem ============================================
rem 確認5: DB_PASS再入力
rem ============================================
:RETYPE_DBPASS
echo.
echo [確認5] DB_PASS を再入力してください
set "DB_PASS_CONFIRM="
set /p DB_PASS_CONFIRM=確認用DB_PASS:
if "%DB_PASS_CONFIRM%"=="" (
  echo [ERROR] 確認用DB_PASSが未入力です
  echo [ERROR] 確認用DB_PASSが未入力です >> "%LOG_FILE%"
  goto :RETYPE_DBPASS
)
if not "%DB_PASS_CONFIRM%"=="%DB_PASS%" (
  echo [ERROR] DB_PASSが一致しません
  echo [ERROR] DB_PASS不一致 >> "%LOG_FILE%"
  goto :RETYPE_DBPASS
)

rem ============================================
rem 最終確認メッセージ
rem ============================================
:FINAL_CONFIRM
echo.
echo ============================================================
echo %RED%最終確認: 実行する場合は大文字で EXECUTE を入力してください%RESET%
echo %RED%中止する場合は大文字で NO を入力してください%RESET%
echo ============================================================
set "CONFIRM="
set /p CONFIRM=EXECUTE / NO :
if "%CONFIRM%"=="EXECUTE" goto :PROD_CHECK
if "%CONFIRM%"=="NO" (
  echo 中止しました
  echo [INFO] ユーザー中止(最終確認) >> "%LOG_FILE%"
  exit /b 1
)
echo [ERROR] 大文字の EXECUTE か NO を入力してください
goto :FINAL_CONFIRM

rem ============================================
rem 本番警告確認
rem ============================================
:PROD_CHECK
if "%IS_PROD%"=="1" (
  echo.
  echo ############################################################
  echo ############################################################
  echo %RED%!!! 警告: 本番環境の可能性があります !!!%RESET%
  echo.
  echo %RED%HOST : %DB_HOST%%RESET%
  echo %RED%PORT : %DB_PORT%%RESET%
  echo %RED%DB   : %DB_NAME%%RESET%
  echo %RED%USER : %DB_USER%%RESET%
  echo.
  echo %RED%!!! 本当にこの接続先へインポートするか確認してください !!!%RESET%
  echo ############################################################
  echo ############################################################

  :PROD_CONFIRM_LOOP
  set "PROD_CONFIRM="
  set /p PROD_CONFIRM=本番環境へ実行する場合は大文字で EXECUTE / 中止は大文字で NO :
  if "%PROD_CONFIRM%"=="EXECUTE" goto :BACKUP_START
  if "%PROD_CONFIRM%"=="NO" (
    echo 中止しました
    echo [INFO] ユーザー中止(本番確認) >> "%LOG_FILE%"
    exit /b 1
  )
  echo [ERROR] 大文字の EXECUTE か NO を入力してください
  goto :PROD_CONFIRM_LOOP
)

goto :BACKUP_START

rem ============================================
rem 1. バックアップ
rem ============================================
:BACKUP_START
echo [INFO] バックアップ開始
echo [INFO] バックアップ開始 >> "%LOG_FILE%"

"%MYSQLDUMP_EXE%" ^
  --default-character-set=utf8mb4 ^
  -h "%DB_HOST%" ^
  -P %DB_PORT% ^
  -u "%DB_USER%" ^
  -p"%DB_PASS%" ^
  --single-transaction ^
  --routines ^
  --events ^
  --triggers ^
  "%DB_NAME%" > "%BACKUP_FILE%" 2>> "%LOG_FILE%"

if errorlevel 1 (
  echo [ERROR] バックアップ失敗
  echo [ERROR] バックアップ失敗 >> "%LOG_FILE%"
  exit /b 1
)

if not exist "%BACKUP_FILE%" (
  echo [ERROR] バックアップファイル未作成
  echo [ERROR] バックアップファイル未作成 >> "%LOG_FILE%"
  exit /b 1
)

for %%A in ("%BACKUP_FILE%") do set "BKP_SIZE=%%~zA"
if "%BKP_SIZE%"=="0" (
  echo [ERROR] バックアップファイルが0バイトです
  echo [ERROR] バックアップファイルが0バイトです >> "%LOG_FILE%"
  exit /b 1
)

echo [INFO] バックアップ成功: %BACKUP_FILE%
echo [INFO] バックアップ成功: %BACKUP_FILE% >> "%LOG_FILE%"

rem ============================================
rem 2. import
rem ============================================
echo [INFO] import開始
echo [INFO] import開始 >> "%LOG_FILE%"

echo.
echo ===== 実行SQL(全文) =====
type "%DUMP_FILE%"

echo.>> "%LOG_FILE%"
echo ===== 実行SQL(全文) =====>> "%LOG_FILE%"
type "%DUMP_FILE%" >> "%LOG_FILE%"
echo ===== 実行SQLここまで =====>> "%LOG_FILE%"

"%MYSQL_EXE%" ^
  --default-character-set=utf8mb4 ^
  -h "%DB_HOST%" ^
  -P %DB_PORT% ^
  -u "%DB_USER%" ^
  -p"%DB_PASS%" ^
  "%DB_NAME%" < "%DUMP_FILE%" >> "%LOG_FILE%" 2>&1

if errorlevel 1 (
  echo [ERROR] import失敗
  echo [ERROR] import失敗 >> "%LOG_FILE%"
  exit /b 1
)

echo [INFO] import成功
echo [INFO] import成功 >> "%LOG_FILE%"
echo.
echo ===== 完了 =====
echo バックアップ: %YELLOW%%BACKUP_FILE%%RESET%
echo ログ      : %YELLOW%%LOG_FILE%%RESET%
exit /b 0

```






``` sql 
SET @table_name = 'your_table';

SELECT CONCAT(
  'SELECT CONCAT(',
  '''INSERT INTO `', TABLE_NAME, '` (',
  GROUP_CONCAT(CONCAT('`', COLUMN_NAME, '`') ORDER BY ORDINAL_POSITION SEPARATOR ', '),
  ') VALUES ('', ',
  GROUP_CONCAT(
    CONCAT(
      'CASE ',
      'WHEN `', COLUMN_NAME, '` IS NULL THEN ''NULL'' ',
      'ELSE QUOTE(`', COLUMN_NAME, '`) ',
      'END'
    )
    ORDER BY ORDINAL_POSITION
    SEPARATOR ', '', '', '
  ),
  ', '');'' ) AS insert_sql ',
  'FROM `', TABLE_NAME, '`;'
) AS generated_sql
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = @table_name
GROUP BY TABLE_NAME;
```
