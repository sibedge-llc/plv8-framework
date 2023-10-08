exports.getFieldInfo = function(schema, plv8Instance)
{
    const sql = `WITH pk AS
      (SELECT c.column_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
        JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
          AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
        WHERE constraint_type = 'PRIMARY KEY')
  
      SELECT gc.table_name AS "TableName", gc.column_name AS "ColumnName",
             ic.data_type AS "DataType", ic.is_nullable='YES' AS "IsNullable",
             ic.is_generated='ALWAYS' AS "IsGenerated",
             pk.column_name IS NOT NULL AS "IsPrimaryKey",
             ic.column_default IS NOT NULL AS "HasDefaultValue"
         FROM graphql.schema_columns gc
         LEFT JOIN information_schema.columns ic ON gc.table_name=ic.table_name AND gc.column_name=ic.column_name
         LEFT JOIN pk ON (pk.column_name=ic.column_name AND pk.table_name=ic.table_name)
         WHERE ic.table_schema::name = '${schema}'::name;`;

    return plv8Instance.execute(sql);
}
