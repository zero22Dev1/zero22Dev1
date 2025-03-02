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




' スタイルの作成
c1FlexGrid1.Styles.Add("shortTimeStyle")
c1FlexGrid1.Styles("shortTimeStyle").DataType = GetType(DateTime) ' データ型をDateTimeに設定
c1FlexGrid1.Styles("shortTimeStyle").Format = "t" ' 短い時刻形式を指定

' スタイルをセルに適用し、現在の時刻を設定
c1FlexGrid1.SetCellStyle(1, 1, c1FlexGrid1.Styles("shortTimeStyle"))
c1FlexGrid1(1, 1) = DateTime.Now



Imports System.Data
Imports System.Data.SqlClient
Imports C1.Win.C1FlexGrid
Imports System.Drawing

Public Class Form1
    Private Sub Form1_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        ' 1. データベースから非連結モードでデータを取得し、DataTable に格納
        Dim dt As DataTable = GetDataTableFromDatabase()
        
        ' 2. 取得した DataTable を FlexGrid の DataSource に設定
        C1FlexGrid1.DataSource = dt
        
        ' 3. ヘッダーとして固定する行数を2行に設定（固定行はインデックス0～1）
        C1FlexGrid1.Rows.Fixed = 2
        
        ' 4. 書式設定（ここでは例として「予算」と「実績」列に通貨書式を設定）
        C1FlexGrid1.Cols("予算").Format = "c"
        C1FlexGrid1.Cols("実績").Format = "c"
        
        ' 5. Subtotal メソッドを使用して、3行目（インデックス2）に合計行を表示
        ' まず、既存の小計行をクリアします
        C1FlexGrid1.Subtotal(AggregateEnum.Clear)
        
        ' ※ ここでは、グループ化の基準として「地域」列（列インデックス0）を利用する例です。
        '     （すべてのデータが同じ「地域」の場合、1グループとして全体の合計が算出されます。）
        ' 第3引数に C1FlexGrid1.Rows.Fixed を指定すると、固定行直後、つまり3行目に小計行が挿入されます。
        Dim colIndexYosan As Integer = C1FlexGrid1.Cols("予算").Index
        Dim colIndexJisseki As Integer = C1FlexGrid1.Cols("実績").Index
        
        ' 「予算」列の合計を計算し、「総予算」というキャプションを付与
        C1FlexGrid1.Subtotal(AggregateEnum.Sum, 0, C1FlexGrid1.Rows.Fixed, colIndexYosan, "総予算")
        ' 「実績」列の合計を計算し、「総実績」というキャプションを付与
        C1FlexGrid1.Subtotal(AggregateEnum.Sum, 0, C1FlexGrid1.Rows.Fixed, colIndexJisseki, "総実績")
        
        ' ※ 必要に応じて、合計行のスタイル（背景色など）を変更できます
        C1FlexGrid1.Rows(C1FlexGrid1.Rows.Fixed).Style.BackColor = Color.LightYellow
    End Sub

    ''' <summary>
    ''' データベースからデータを取得し、DataTable として返す（非連結モード）
    ''' ※ 接続文字列やクエリは環境に合わせて変更してください
    ''' </summary>
    Private Function GetDataTableFromDatabase() As DataTable
        Dim dt As New DataTable()
        Dim connectionString As String = "Data Source=YourServer;Initial Catalog=YourDatabase;Integrated Security=True"
        Dim query As String = "SELECT * FROM YourTable"

        Using conn As New SqlConnection(connectionString)
            Using adapter As New SqlDataAdapter(query, conn)
                adapter.Fill(dt)
            End Using
        End Using

        Return dt
    End Function
End Class
