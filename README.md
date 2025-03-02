# テスト


' 例: Oracleから取得した結果が格納されたDataTable dt があるとします
' FlexGrid の固定行数を3行に設定している前提
C1FlexGrid1.Rows.Fixed = 3

' DataTable の各行を、固定行以降の行に追加していく方法
Dim currentRow As Integer = C1FlexGrid1.Rows.Count

For Each dr As DataRow In dt.Rows
    ' 新規行を追加（Rows.AddItem メソッドも利用可能ですが、
    ' ここでは Rows.Count プロパティを利用して行数を調整しています）
    C1FlexGrid1.Rows.Count += 1

    ' 追加した行のインデックスは、Rows.Count-1 となります
    Dim newRowIndex As Integer = C1FlexGrid1.Rows.Count - 1

    ' DataTable の各列の値を、FlexGrid の該当セルにセット
    ' ここでは例として、DataTable の1列目～n列目を FlexGrid の0列目～に対応させています
    For colIndex As Integer = 0 To dt.Columns.Count - 1
        C1FlexGrid1(newRowIndex, colIndex) = dr(colIndex)
    Next
Next




Dim report As New VBRReport
Dim sheet As VBRSheet

' レポートファイルを開く
report.Open("sample.vbr") ' 既存のVBRファイルを指定

' シートを取得（1枚目のシート）
sheet = report.Sheets(0)

' セルに改行を含むデータをセット（例：2行目の3列目）
sheet.Cells(2, 3).Value = "行1" & vbNewLine & "行2" & vbNewLine & "行3"

' セルの折り返し設定を有効化（必要に応じて）
sheet.Cells(2, 3).WordWrap = True

' セルの高さを自動調整（オプション）
sheet.Cells(2, 3).AutoFit()

' レポートを表示
report.Show()