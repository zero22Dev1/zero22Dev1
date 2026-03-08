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
