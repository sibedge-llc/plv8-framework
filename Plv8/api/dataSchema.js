exports.getFieldInfo = function(schema, plv8Instance)
{
    const sql = `WITH pk AS
    (SELECT c.column_name, tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
      WHERE constraint_type = 'PRIMARY KEY'),
    s1 AS
    (SELECT p.proname AS "TableName", unnest(p.proallargtypes) AS type_oid, unnest(p.proargnames) AS "ColumnName",
        unnest(p.proargmodes) AS arg_mode
      FROM pg_proc p
      INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
      WHERE ns.nspname = 'func')
  
  SELECT gc.table_name AS "TableName", gc.column_name AS "ColumnName",
              ic.data_type AS "DataType", ic.is_nullable='YES' AS "IsNullable",
              ic.is_generated='ALWAYS' AS "IsGenerated",
              pk.column_name IS NOT NULL AS "IsPrimaryKey",
              ic.column_default IS NOT NULL AS "HasDefaultValue",
              FALSE AS "IsFunction"
      FROM graphql.schema_columns gc
      LEFT JOIN information_schema.columns ic ON gc.table_name=ic.table_name AND gc.column_name=ic.column_name
      LEFT JOIN pk ON (pk.column_name=ic.column_name AND pk.table_name=ic.table_name)
      WHERE ic.table_schema::name = '${schema}'::name
  
  UNION
  
  SELECT s1."TableName", s1."ColumnName", oidvectortypes(ARRAY[s1.type_oid]::oidvector) AS "DataType",
              TRUE "IsNullable", FALSE AS "IsGenerated", FALSE AS "IsPrimaryKey", FALSE "HasDefaultValue",
              TRUE AS "IsFunction"
      FROM s1
      WHERE arg_mode='t'
      
  ORDER BY "TableName", "ColumnName";`;

    return plv8Instance.execute(sql);
}
