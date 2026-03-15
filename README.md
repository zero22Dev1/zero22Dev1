Attribute VB_Name = "CSVMacro"
Option Explicit

'=============================================================
' CSV取り込み・出力マクロ（統合版）
'=============================================================

Public Sub CreateButtons()
    Dim ws As Worksheet
    Dim targetSheetName As String
    
    targetSheetName = InputBox( _
        "ボタンを配置するシート名を入力してください。", _
        "ボタン配置先", ActiveSheet.Name)
    If targetSheetName = "" Then
        MsgBox "キャンセルされました。", vbInformation
        Exit Sub
    End If
    
    Set ws = GetOrCreateSheet(targetSheetName)
    
    Dim shp As Shape
    For Each shp In ws.Shapes
        If shp.Name = "btnImportCSV" Or shp.Name = "btnExportCSV" Or shp.Name = "btnExpandRows" Then
            shp.Delete
        End If
    Next shp
    
    Dim btnImport As Button
    Set btnImport = ws.Buttons.Add( _
        Left:=ws.Range("B2").Left, _
        Top:=ws.Range("B2").Top, _
        Width:=180, _
        Height:=40)
    With btnImport
        .Name = "btnImportCSV"
        .Caption = "CSV 取り込み"
        .OnAction = "ImportCSV"
        .Font.Size = 12
        .Font.Bold = True
    End With
    
    Dim btnExport As Button
    Set btnExport = ws.Buttons.Add( _
        Left:=ws.Range("B2").Left + 200, _
        Top:=ws.Range("B2").Top, _
        Width:=180, _
        Height:=40)
    With btnExport
        .Name = "btnExportCSV"
        .Caption = "CSV 出力（UTF-8）"
        .OnAction = "ExportCSV"
        .Font.Size = 12
        .Font.Bold = True
    End With
    
    Dim btnExpand As Button
    Set btnExpand = ws.Buttons.Add( _
        Left:=ws.Range("B2").Left + 400, _
        Top:=ws.Range("B2").Top, _
        Width:=180, _
        Height:=40)
    With btnExpand
        .Name = "btnExpandRows"
        .Caption = "行展開（変換→貼付）"
        .OnAction = "ExpandRows"
        .Font.Size = 12
        .Font.Bold = True
    End With
    
    ws.Activate
    MsgBox "[" & targetSheetName & "] シートにボタンを配置しました。" & vbCrLf & vbCrLf & _
           "・CSV 取り込み … CSVファイルをシートに読み込み" & vbCrLf & _
           "・CSV 出力（UTF-8）… シートのデータをCSVに書き出し" & vbCrLf & _
           "・行展開（変換→貼付）… 変換シートのH列×の行を展開", _
           vbInformation, "セットアップ完了"
End Sub

'=============================================================
' CSV取り込み（ImportCSV）
'=============================================================

Public Sub ImportCSV()
    Dim csvPath As String
    Dim sheetName As String
    Dim ws As Worksheet
    
    csvPath = SelectCSVFile()
    If csvPath = "" Then Exit Sub
    
    sheetName = InputBox( _
        "取り込み先のシート名を入力してください。" & vbCrLf & _
        "（存在しない場合は自動作成されます）", _
        "シート名指定", "データ貼り付け")
    If sheetName = "" Then
        MsgBox "キャンセルされました。", vbInformation
        Exit Sub
    End If
    
    Set ws = GetOrCreateSheet(sheetName)
    ws.Cells.Clear
    
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    
    Dim rowCount As Long
    rowCount = ReadCSVToSheet(csvPath, ws)
    
    FormatSheet ws, rowCount
    
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
    
    ws.Activate
    MsgBox rowCount - 1 & " 件のデータを [" & sheetName & "] シートに取り込みました。", _
           vbInformation, "取り込み完了"
End Sub

'=============================================================
' CSV出力（ExportCSV）
'=============================================================

Public Sub ExportCSV()
    Dim ws As Worksheet
    Dim sheetName As String
    Dim savePath As String
    
    sheetName = InputBox( _
        "CSV出力するシート名を入力してください。", _
        "出力元シート指定", "データ貼り付け")
    If sheetName = "" Then
        MsgBox "キャンセルされました。", vbInformation
        Exit Sub
    End If
    
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    If ws Is Nothing Then
        MsgBox "シート [" & sheetName & "] が見つかりません。", vbExclamation
        Exit Sub
    End If
    
    savePath = SelectSaveFolder()
    If savePath = "" Then Exit Sub
    
    Dim lastRow As Long
    Dim lastCol As Long
    Dim tmpRow As Long
    Dim tmpCol As Long
    
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    
    ' 全列から最終行を取得（A列が空でも正しく検出）
    lastRow = 0
    For tmpCol = 1 To lastCol
        tmpRow = ws.Cells(ws.Rows.Count, tmpCol).End(xlUp).Row
        If tmpRow > lastRow Then lastRow = tmpRow
    Next tmpCol
    
    If lastRow <= 1 Or lastCol = 0 Then
        MsgBox "シートにデータがありません。", vbExclamation
        Exit Sub
    End If
    
    Dim stream As Object
    Set stream = CreateObject("ADODB.Stream")
    
    stream.Type = 2
    stream.charset = "UTF-8"
    stream.Open
    
    Dim i As Long, j As Long
    Dim cellVal As String
    
    For i = 1 To lastRow
        Dim cols() As String
        ReDim cols(lastCol - 1)
        
        For j = 1 To lastCol
            cellVal = CStr(ws.Cells(i, j).Value)
            cellVal = """" & Replace(cellVal, """", """""") & """"
            cols(j - 1) = cellVal
        Next j
        
        stream.WriteText Join(cols, ",") & vbCrLf
    Next i
    
    stream.SaveToFile savePath, 2
    stream.Close
    Set stream = Nothing
    
    MsgBox lastRow - 1 & " 件のデータを CSV出力しました。" & vbCrLf & vbCrLf & _
           "保存先: " & savePath, _
           vbInformation, "CSV出力完了"
End Sub

' 保存先フォルダを選択し、固定ファイル名「入荷データ.csv」を返す
Private Function SelectSaveFolder() As String
    Dim fd As FileDialog
    Set fd = Application.FileDialog(msoFileDialogFolderPicker)
    
    With fd
        .Title = "CSVファイルの保存先フォルダを選択してください"
        
        If .Show = -1 Then
            Dim folderPath As String
            folderPath = .SelectedItems(1)
            If Right(folderPath, 1) <> "\" Then folderPath = folderPath & "\"
            SelectSaveFolder = folderPath & "入荷データ.csv"
        Else
            SelectSaveFolder = ""
        End If
    End With
End Function

'=============================================================
' 行展開マクロ（ExpandRows）
'=============================================================

Public Sub ExpandRows()
    Dim wsConvert As Worksheet
    Dim wsData As Worksheet
    
    On Error Resume Next
    Set wsConvert = ThisWorkbook.Worksheets("変換")
    Set wsData = ThisWorkbook.Worksheets("データ貼り付け")
    On Error GoTo 0
    
    If wsConvert Is Nothing Then
        MsgBox "「変換」シートが見つかりません。", vbExclamation
        Exit Sub
    End If
    If wsData Is Nothing Then
        MsgBox "「データ貼り付け」シートが見つかりません。", vbExclamation
        Exit Sub
    End If
    
    Dim dataLastCol As Long
    dataLastCol = wsData.Cells(1, wsData.Columns.Count).End(xlToLeft).Column
    
    Dim convLastRow As Long
    Dim convCol As Long
    Dim convRow2 As Long
    Dim convMaxCol As Long
    convMaxCol = wsConvert.Cells(2, wsConvert.Columns.Count).End(xlToLeft).Column
    convLastRow = 0
    For convCol = 1 To convMaxCol
        convRow2 = wsConvert.Cells(wsConvert.Rows.Count, convCol).End(xlUp).Row
        If convRow2 > convLastRow Then convLastRow = convRow2
    Next convCol
    
    Dim colProdCD As Long: colProdCD = FindColumn(wsData, "商品CD")
    Dim colQty As Long: colQty = FindColumn(wsData, "予定数量")
    Dim colOrderNo As Long: colOrderNo = FindColumn(wsData, "予定顧客発注No")
    Dim colCustNo As Long: colCustNo = FindColumn(wsData, "客注No")
    Dim colCustCode As Long: colCustCode = FindColumn(wsData, "顧客No")
    
    If colProdCD = 0 Then
        MsgBox "「商品CD」列が見つかりません。", vbExclamation
        Exit Sub
    End If
    
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    
    Dim addedCount As Long
    addedCount = 0
    
    Dim addedRows() As Long
    Dim addedIdx As Long
    addedIdx = 0
    ReDim addedRows(1 To 1000)
    
    Dim dataLastRow As Long
    Dim findCol As Long
    Dim findRow As Long
    
    Dim convRow As Long
    For convRow = 3 To convLastRow
        Dim hVal As String
        hVal = Trim(CStr(wsConvert.Cells(convRow, 8).Value))
        
        If hVal = ChrW(&H2715) Or hVal = ChrW(&HFF58) Or hVal = ChrW(&HD7) Or hVal = "×" Or hVal = "x" Or hVal = "X" Then
            Dim valC As Double
            Dim valG As Double
            valC = 0: valG = 0
            
            If IsNumeric(wsConvert.Cells(convRow, 3).Value) Then valC = CDbl(wsConvert.Cells(convRow, 3).Value)
            If IsNumeric(wsConvert.Cells(convRow, 7).Value) Then valG = CDbl(wsConvert.Cells(convRow, 7).Value)
            
            If valG = 0 Then GoTo NextConvRow
            
            Dim rowCount As Long
            rowCount = CLng(valC / valG)
            If rowCount <= 1 Then GoTo NextConvRow
            
            Dim targetProductCD As String
            targetProductCD = CStr(wsConvert.Cells(convRow, 1).Value)
            
            dataLastRow = 0
            For findCol = 1 To dataLastCol
                findRow = wsData.Cells(wsData.Rows.Count, findCol).End(xlUp).Row
                If findRow > dataLastRow Then dataLastRow = findRow
            Next findCol
            
            Dim templateRow As Long
            templateRow = 0
            Dim dr As Long
            For dr = 2 To dataLastRow
                If CStr(wsData.Cells(dr, colProdCD).Value) = targetProductCD Then
                    templateRow = dr
                    Exit For
                End If
            Next dr
            
            If templateRow = 0 Then GoTo NextConvRow
            
            Dim origQty As Double
            If colQty > 0 And IsNumeric(wsData.Cells(templateRow, colQty).Value) Then
                origQty = CDbl(wsData.Cells(templateRow, colQty).Value)
            Else
                origQty = 0
            End If
            
            Dim origOrderNo As String
            If colOrderNo > 0 Then origOrderNo = CStr(wsData.Cells(templateRow, colOrderNo).Value)
            
            Dim origCustNoVal As String
            If colCustNo > 0 Then origCustNoVal = CStr(wsData.Cells(templateRow, colCustNo).Value)
            
            Dim splitQty As Double
            splitQty = valG
            
            Dim insertCount As Long
            insertCount = rowCount - 1
            If insertCount > 0 Then
                wsData.Rows(templateRow + 1 & ":" & templateRow + insertCount).Insert Shift:=xlDown
            End If
            
            Dim rc As Long
            For rc = 1 To rowCount
                Dim targetRow As Long
                targetRow = templateRow + rc - 1
                
                If rc >= 2 Then
                    Dim col As Long
                    For col = 1 To dataLastCol
                        If col = colQty Then
                            ' 予定数量列は数値のままコピー
                            wsData.Cells(targetRow, col).Value = wsData.Cells(templateRow, col).Value
                        Else
                            wsData.Cells(targetRow, col).NumberFormat = "@"
                            wsData.Cells(targetRow, col).Value = wsData.Cells(templateRow, col).Value
                        End If
                    Next col
                End If
                
                ' 元の行も含め全展開行を記録（黄色着色用）
                addedIdx = addedIdx + 1
                If addedIdx > UBound(addedRows) Then ReDim Preserve addedRows(1 To addedIdx + 1000)
                addedRows(addedIdx) = targetRow
                
                If colQty > 0 Then
                    wsData.Cells(targetRow, colQty).Value = splitQty
                End If
                
                If colOrderNo > 0 And origOrderNo <> "" Then
                    wsData.Cells(targetRow, colOrderNo).Value = origOrderNo & "-" & rc
                End If
                
                If colCustNo > 0 And origCustNoVal <> "" Then
                    wsData.Cells(targetRow, colCustNo).Value = IncrementNumber(origCustNoVal, rc - 1)
                End If
            Next rc
            
            addedCount = addedCount + insertCount
        End If
NextConvRow:
    Next convRow
    
    ' 追加行を黄色に着色
    Dim yellowFill As Long
    yellowFill = RGB(255, 255, 153)
    Dim ai As Long
    For ai = 1 To addedIdx
        Dim paintRow As Long
        paintRow = addedRows(ai)
        Dim pc As Long
        For pc = 1 To dataLastCol
            wsData.Cells(paintRow, pc).Interior.Color = yellowFill
        Next pc
    Next ai
    
    ' 顧客Noでソート
    If colCustCode > 0 Then
        Dim sortLastRow As Long
        Dim sCol As Long
        Dim sRow As Long
        sortLastRow = 0
        For sCol = 1 To dataLastCol
            sRow = wsData.Cells(wsData.Rows.Count, sCol).End(xlUp).Row
            If sRow > sortLastRow Then sortLastRow = sRow
        Next sCol
        
        If sortLastRow >= 2 Then
            Dim sortRange As Range
            Set sortRange = wsData.Range(wsData.Cells(1, 1), wsData.Cells(sortLastRow, dataLastCol))
            
            wsData.Sort.SortFields.Clear
            wsData.Sort.SortFields.Add2 _
                Key:=wsData.Range(wsData.Cells(2, colCustCode), wsData.Cells(sortLastRow, colCustCode)), _
                SortOn:=xlSortOnValues, _
                Order:=xlAscending, _
                DataOption:=xlSortNormal
            
            With wsData.Sort
                .SetRange sortRange
                .Header = xlYes
                .MatchCase = False
                .Orientation = xlTopToBottom
                .Apply
            End With
        End If
    End If
    
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
    
    wsData.Activate
    wsData.Range("A1").Select
    
    If addedCount > 0 Then
        MsgBox addedCount & " 行を追加展開しました。" & vbCrLf & _
               "（追加行は黄色で表示、顧客Noでソート済み）", _
               vbInformation, "行展開完了"
    Else
        MsgBox "展開対象の行がありませんでした。" & vbCrLf & _
               "変換シートのH列に「×」がある行を確認してください。", _
               vbInformation, "行展開"
    End If
End Sub

'=============================================================
' 共通関数
'=============================================================

Private Function SelectCSVFile() As String
    Dim fd As FileDialog
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    
    With fd
        .Title = "取り込むCSVファイルを選択してください"
        .Filters.Clear
        .Filters.Add "CSVファイル", "*.csv"
        .Filters.Add "すべてのファイル", "*.*"
        .AllowMultiSelect = False
        
        If .Show = -1 Then
            SelectCSVFile = .SelectedItems(1)
        Else
            SelectCSVFile = ""
        End If
    End With
End Function

Private Function GetOrCreateSheet(sheetName As String) As Worksheet
    Dim ws As Worksheet
    
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = sheetName
    End If
    
    Set GetOrCreateSheet = ws
End Function

Private Function ReadCSVToSheet(csvPath As String, ws As Worksheet) As Long
    Dim fileContent As String
    Dim lines() As String
    Dim fields() As String
    Dim r As Long, c As Long
    
    fileContent = ReadTextFile(csvPath)
    
    fileContent = Replace(fileContent, vbCrLf, vbLf)
    fileContent = Replace(fileContent, vbCr, vbLf)
    lines = Split(fileContent, vbLf)
    
    ' ヘッダー行から予定数量の列位置を特定
    Dim qtyCol As Long
    qtyCol = -1
    
    r = 0
    Dim i As Long
    For i = 0 To UBound(lines)
        If Len(Trim(lines(i))) > 0 Then
            r = r + 1
            fields = ParseCSVLine(lines(i))
            
            ' 1行目（ヘッダー）で予定数量列を検索
            If r = 1 Then
                Dim hc As Long
                For hc = 0 To UBound(fields)
                    If fields(hc) = "予定数量" Then
                        qtyCol = hc
                        Exit For
                    End If
                Next hc
            End If
            
            For c = 0 To UBound(fields)
                If c = qtyCol And r >= 2 Then
                    ' 予定数量列は数値として書き込み
                    If IsNumeric(fields(c)) Then
                        ws.Cells(r, c + 1).Value = CDbl(fields(c))
                    Else
                        ws.Cells(r, c + 1).Value = fields(c)
                    End If
                Else
                    ws.Cells(r, c + 1).NumberFormat = "@"
                    ws.Cells(r, c + 1).Value = fields(c)
                End If
            Next c
        End If
    Next i
    
    ReadCSVToSheet = r
End Function

Private Function ReadTextFile(filePath As String) As String
    Dim buf() As Byte
    Dim fileNum As Integer
    Dim fileLen As Long
    
    fileNum = FreeFile
    Open filePath For Binary Access Read As #fileNum
    fileLen = LOF(fileNum)
    If fileLen = 0 Then
        Close #fileNum
        ReadTextFile = ""
        Exit Function
    End If
    ReDim buf(0 To fileLen - 1)
    Get #fileNum, , buf
    Close #fileNum
    
    If fileLen >= 3 Then
        If buf(0) = &HEF And buf(1) = &HBB And buf(2) = &HBF Then
            ReadTextFile = ReadWithADODB(filePath, "UTF-8")
            Exit Function
        End If
    End If
    
    If IsLikelyUTF8(buf) Then
        ReadTextFile = ReadWithADODB(filePath, "UTF-8")
    Else
        ReadTextFile = ReadWithADODB(filePath, "Shift_JIS")
    End If
End Function

Private Function ReadWithADODB(filePath As String, charset As String) As String
    Dim stream As Object
    Set stream = CreateObject("ADODB.Stream")
    
    With stream
        .Type = 2
        .charset = charset
        .Open
        .LoadFromFile filePath
        ReadWithADODB = .ReadText(-1)
        .Close
    End With
    
    Set stream = Nothing
End Function

Private Function IsLikelyUTF8(buf() As Byte) As Boolean
    Dim i As Long
    Dim upperBound As Long
    Dim expected As Long
    Dim multiByte As Long
    
    upperBound = UBound(buf)
    multiByte = 0
    i = 0
    
    Do While i <= upperBound
        If buf(i) <= &H7F Then
            i = i + 1
        ElseIf (buf(i) And &HE0) = &HC0 Then
            expected = 1
            If Not CheckContinuation(buf, i, expected, upperBound) Then
                IsLikelyUTF8 = False
                Exit Function
            End If
            multiByte = multiByte + 1
            i = i + 2
        ElseIf (buf(i) And &HF0) = &HE0 Then
            expected = 2
            If Not CheckContinuation(buf, i, expected, upperBound) Then
                IsLikelyUTF8 = False
                Exit Function
            End If
            multiByte = multiByte + 1
            i = i + 3
        ElseIf (buf(i) And &HF8) = &HF0 Then
            expected = 3
            If Not CheckContinuation(buf, i, expected, upperBound) Then
                IsLikelyUTF8 = False
                Exit Function
            End If
            multiByte = multiByte + 1
            i = i + 4
        Else
            IsLikelyUTF8 = False
            Exit Function
        End If
    Loop
    
    IsLikelyUTF8 = (multiByte > 0)
End Function

Private Function CheckContinuation(buf() As Byte, startPos As Long, count As Long, upperBound As Long) As Boolean
    Dim j As Long
    For j = 1 To count
        If startPos + j > upperBound Then
            CheckContinuation = False
            Exit Function
        End If
        If (buf(startPos + j) And &HC0) <> &H80 Then
            CheckContinuation = False
            Exit Function
        End If
    Next j
    CheckContinuation = True
End Function

Private Function ParseCSVLine(lineText As String) As String()
    Dim result() As String
    Dim fieldCount As Long
    Dim i As Long
    Dim inQuote As Boolean
    Dim ch As String
    Dim field As String
    
    fieldCount = 0
    inQuote = False
    field = ""
    
    For i = 1 To Len(lineText)
        ch = Mid(lineText, i, 1)
        
        If inQuote Then
            If ch = """" Then
                If i < Len(lineText) And Mid(lineText, i + 1, 1) = """" Then
                    field = field & """"
                    i = i + 1
                Else
                    inQuote = False
                End If
            Else
                field = field & ch
            End If
        Else
            If ch = """" Then
                inQuote = True
            ElseIf ch = "," Then
                ReDim Preserve result(0 To fieldCount)
                result(fieldCount) = field
                fieldCount = fieldCount + 1
                field = ""
            Else
                field = field & ch
            End If
        End If
    Next i
    
    ReDim Preserve result(0 To fieldCount)
    result(fieldCount) = field
    
    ParseCSVLine = result
End Function

Private Sub FormatSheet(ws As Worksheet, rowCount As Long)
    If rowCount = 0 Then Exit Sub
    
    Dim lastCol As Long
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    
    With ws.Range(ws.Cells(1, 1), ws.Cells(1, lastCol))
        .Font.Bold = True
        .Interior.Color = RGB(68, 114, 196)
        .Font.Color = RGB(255, 255, 255)
        .HorizontalAlignment = xlCenter
    End With
    
    ws.Range(ws.Cells(1, 1), ws.Cells(rowCount, lastCol)).Columns.AutoFit
    
    If rowCount > 1 Then
        ws.Range(ws.Cells(1, 1), ws.Cells(rowCount, lastCol)).AutoFilter
    End If
    
    With ws.Range(ws.Cells(1, 1), ws.Cells(rowCount, lastCol))
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Borders.Color = RGB(180, 180, 180)
    End With
    
    ws.Activate
    ws.Rows(2).Select
    ActiveWindow.FreezePanes = True
    ws.Range("A1").Select
End Sub

Private Function FindColumn(ws As Worksheet, headerName As String) As Long
    Dim lastCol As Long
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    Dim c As Long
    For c = 1 To lastCol
        If CStr(ws.Cells(1, c).Value) = headerName Then
            FindColumn = c
            Exit Function
        End If
    Next c
    FindColumn = 0
End Function

Private Function IncrementNumber(baseStr As String, offset As Long) As String
    If offset = 0 Then
        IncrementNumber = baseStr
        Exit Function
    End If
    
    Dim numStart As Long, numEnd As Long
    Dim i As Long
    Dim foundNum As Boolean
    
    numStart = 0: numEnd = 0: foundNum = False
    
    For i = Len(baseStr) To 1 Step -1
        Dim ch As String
        ch = Mid(baseStr, i, 1)
        If ch >= "0" And ch <= "9" Then
            If Not foundNum Then
                numEnd = i
                foundNum = True
            End If
            numStart = i
        Else
            If foundNum Then Exit For
        End If
    Next i
    
    If Not foundNum Then
        IncrementNumber = baseStr
        Exit Function
    End If
    
    Dim numStr As String
    numStr = Mid(baseStr, numStart, numEnd - numStart + 1)
    Dim numLen As Long
    numLen = Len(numStr)
    Dim newNum As Long
    newNum = CLng(numStr) + offset
    
    Dim newNumStr As String
    newNumStr = CStr(newNum)
    If Len(newNumStr) < numLen Then
        newNumStr = String(numLen - Len(newNumStr), "0") & newNumStr
    End If
    
    IncrementNumber = Left(baseStr, numStart - 1) & newNumStr & Mid(baseStr, numEnd + 1)
End Function
