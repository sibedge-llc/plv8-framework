CREATE SCHEMA graphql;
CREATE SCHEMA func;

CREATE TABLE graphql.additional_columns
(
  column_name name NOT NULL,
  table_name name NOT NULL,
  PRIMARY KEY (column_name, table_name)
);

CREATE TABLE graphql.additional_foreign_keys
(
  column_name name NOT NULL,
  foreign_table_name name NOT NULL,
  foreign_column_name name NOT NULL,
  table_name name NOT NULL,
  PRIMARY KEY (column_name, foreign_table_name, foreign_column_name, table_name)
);

CREATE TABLE graphql.aliases
(
  column_name name NOT NULL,
  alias name NOT NULL,
  PRIMARY KEY (column_name, alias)
);

CREATE MATERIALIZED VIEW graphql.schema_columns AS 
 SELECT columns.column_name,
    columns.table_name
   FROM information_schema.columns
  WHERE columns.table_schema::name = 'public'::name
UNION
 SELECT additional_columns.column_name,
    additional_columns.table_name
   FROM graphql.additional_columns
UNION
 SELECT unnest(p.proargnames) AS column_name, p.proname AS table_name
   FROM pg_proc p INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
  WHERE ns.nspname = 'func'   
WITH DATA;

CREATE MATERIALIZED VIEW graphql.schema_foreign_keys AS 
 SELECT kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.table_name
   FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name::name
	   = kcu.constraint_name::name AND tc.table_schema::name = kcu.table_schema::name
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name::name
	   = tc.constraint_name::name AND ccu.table_schema::name = tc.table_schema::name
  WHERE tc.constraint_type::text = 'FOREIGN KEY'::text
    AND ccu.constraint_schema::name = 'public'::name
UNION
 SELECT additional_foreign_keys.column_name,
    additional_foreign_keys.foreign_table_name,
    additional_foreign_keys.foreign_column_name,
    additional_foreign_keys.table_name
   FROM graphql.additional_foreign_keys
WITH DATA;

CREATE TABLE graphql.authorize
(
  table_name name PRIMARY KEY NOT NULL,
  access_level integer NOT NULL
);
