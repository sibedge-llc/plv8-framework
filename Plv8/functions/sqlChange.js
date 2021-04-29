/*SQL
DROP FUNCTION IF EXISTS plv8.sql_change;
CREATE OR REPLACE FUNCTION plv8.sql_change(
  "tableName" text,
  entities jsonb,
  "idKeys" text[],
  operation text,
  schema text)
RETURNS jsonb
SQL*/

const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.sqlChange);

const { entities, tableName, idKeys, operation, schema } = args;

/*BEGIN*/
const upsert = operation === "update";
const del = operation === "delete";

const fullTableName = schema
    ? `${plv8.quote_ident(schema)}.${plv8.quote_ident(tableName)}`
    : plv8.quote_ident(tableName);

function getFieldsSql(entity)
{
    const ret = `(${Object.keys(entity).map(x => plv8.quote_ident(x)).join(', ')})`;
    return ret;
}

function getValueSql(value)
{
    const type = typeof value;

    if (type === 'number' || type === 'boolean')
    {
        return value;
    }

    if (!value)
    {
        return 'null';
    }

    return plv8.quote_nullable(value);
}

function getValuesSql(entity)
{
    const values = Object.keys(entity).map(key => getValueSql(entity[key]));

    return `(${values.join(', ')})`;
}

let fields = '';
let values = [];
const multiMode = Array.isArray(entities);

if (del)
{
    if (entities.length < 1)
    {
        exports.ret = null;
    }
}
else if (multiMode)
{
    if (entities.length < 1)
    {
        exports.ret = null;
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
    let sql = `INSERT INTO ${fullTableName} ${fields} VALUES ${values.join(', ')}`;

    if (idKeys && idKeys.length)
    {
        const entity = multiMode ? entities[0] : entities;

        if (upsert && !multiMode)
        {
            const update = Object.keys(entity)
                .filter(x => !idKeys.includes(x))
                .map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(', ');

            const where = idKeys.map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(' AND ');

            sql = `UPDATE ${fullTableName} SET ${update} WHERE ${where}`;
        }
        else
        {
            const keys = idKeys.map(x => plv8.quote_ident(x)).join(', ');            
        
            if (upsert)
            {
                const update = Object.keys(entity)
                    .filter(x => !idKeys.includes(x))
                    .map(x => `${plv8.quote_ident(x)}=EXCLUDED.${plv8.quote_ident(x)}`).join(', ');

                sql += ` ON CONFLICT (${keys}) DO UPDATE SET ${update}`;
            }

            sql += ` RETURNING ${keys}`;
        }
    }

    plv8.elog(NOTICE, sql);
    exports.ret = plv8.execute(sql);
}
else if (del && idKeys && idKeys.length)
{
    const newEntities = multiMode ? entities : [entities];
    const where = newEntities
        .map(e => idKeys.map(x => `(${plv8.quote_ident(x)}=${getValueSql(e[x])})`).join(' AND '))
        .join(' OR ');

    sql = `DELETE FROM ${fullTableName} WHERE ${where}`;

    plv8.elog(NOTICE, sql);
    exports.ret = plv8.execute(sql);
}
else
{
    exports.ret = null;
}
