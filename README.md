```sql
WITH base AS (
  SELECT
    instruction_no,
    work_day,
    box_no,
    mmno,
    nihno,
    -- 1行(=箱)ごとに連番No（並び順は必要に応じて調整）
    ROW_NUMBER() OVER (
      PARTITION BY instruction_no, work_day
      ORDER BY box_no, mmno, nihno
    ) AS no_seq
  FROM src
)
SELECT
  t.`No`,
  t.bt,
  t.`採番値＋B`,
  t.`個数`,
  t.`採番値(1~50)`,
  t.`日`,
  t.`SHNo`,
  t.`MMNO`
FROM (
  -- ヘッダ：個数=99固定、SHNo=MMNO
  SELECT
    b.no_seq AS `No`,
    13 AS bt,
    CONCAT(CEIL(b.no_seq / 50), 'B') AS `採番値＋B`,         -- 1..50→1B, 51..100→2B...
    99 AS `個数`,
    ((b.no_seq - 1) % 50) + 1 AS `採番値(1~50)`,            -- ★バッチ内通番(1..50でループ)
    DATE_FORMAT(b.work_day, '%Y%m%d') AS `日`,
    b.mmno AS `SHNo`,
    b.mmno AS `MMNO`,
    0 AS row_type
  FROM base b

  UNION ALL

  -- 明細：個数=1固定、SHNo=NIHNO
  SELECT
    b.no_seq AS `No`,
    13 AS bt,
    CONCAT(CEIL(b.no_seq / 50), 'B') AS `採番値＋B`,
    1 AS `個数`,
    ((b.no_seq - 1) % 50) + 1 AS `採番値(1~50)`,            -- ★同じくループ
    DATE_FORMAT(b.work_day, '%Y%m%d') AS `日`,
    b.nihno AS `SHNo`,
    b.mmno  AS `MMNO`,
    1 AS row_type
  FROM base b
) t
ORDER BY
  t.`日`,
  t.`No`,
  t.row_type;   -- ヘッダ→明細
```