/*SQL
DROP FUNCTION IF EXISTS plv8.sql_change;
CREATE OR REPLACE FUNCTION plv8.sql_change(
  tableName text,
  entities jsonb,
  idKey text)
RETURNS boolean
SQL*/

const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.sqlChange);

const entities = args.entities;
const tableName = args.tableName;
const idKey = args.idKey;

/*BEGIN*/
function getFieldsSql(entity)
{
  let ret = `(${Object.keys(entity).map(x => '"' + plv8.quote_ident(x) + '"').join(', ')})`;
  return ret;
}

function getValuesSql(entity)
{
  let values = Object.keys(entity).map(key =>
  {
    let value = entity[key];
    let type = typeof value;
    
    if (!value)
    {
      return 'null';
    }
    
    if (type === 'number' || type === 'boolean')
    {
      return value;
    }

    if (type === 'string')
    {
      value = plv8.quote_nullable(value);
    }

    return `'${value}'`;
  })

  return `(${values.join(', ')})`;
}

let fields = '';
let values = [];

if (Array.isArray(entities))
{
  if (entities.length < 1)
  {
    exports.ret = false;
  }
  else
  {
    fields = getFieldsSql(entities[0]);
    values = entities.map(x => getValuesSql(x));
  }
}
else
{
  fields = getFieldsSql(entities);
  values.push(getValuesSql(entities));
}

if (values.length > 0)
{
  let sql = `INSERT INTO "${tableName}" ${fields} VALUES ${values.join(', ')};`;
  plv8.elog(NOTICE, sql);
  plv8.execute(sql);

  exports.ret = true;
}
else
{
  exports.ret = false;
}
