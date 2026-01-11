

```sql
COUNT(CASE WHEN p.product_name = 'jiniA' THEN 1 END) AS package_a_count,
COUNT(CASE WHEN p.product_name = 'jiniB' THEN 1 END) AS package_b_count

```
```cmd
change_mysql80_port_and_restart.bat 3307
```

