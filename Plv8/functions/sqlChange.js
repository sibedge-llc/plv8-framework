/*SQL
DROP FUNCTION IF EXISTS plv8.sql_change;
CREATE OR REPLACE FUNCTION plv8.sql_change(
  "tableName" text,
  entities jsonb,
  "idKeys" text[],
  upsert boolean)
RETURNS jsonb
SQL*/

const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.sqlChange);

const { entities, tableName, idKeys } = args;
const upsert = !!args.upsert;

/*BEGIN*/
function getFieldsSql(entity)
{
    const ret = `(${Object.keys(entity).map(x => plv8.quote_ident(x)).join(', ')})`;
    return ret;
}

function getValueSql(value)
{
    const type = typeof value;

    if (!value)
    {
        return 'null';
    }

    if (type === 'number' || type === 'boolean')
    {
        return value;
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

if (multiMode)
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
    let sql = `INSERT INTO ${plv8.quote_ident(tableName)} ${fields} VALUES ${values.join(', ')}`;

    if (idKeys && idKeys.length)
    {
        const entity = multiMode ? entities[0] : entities;

        if (upsert && !multiMode)
        {
            const update = Object.keys(entity)
                .filter(x => !idKeys.includes(x))
                .map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(', ');

            const where = idKeys.map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(' AND ');

            sql = `UPDATE ${plv8.quote_ident(tableName)} SET ${update} WHERE ${where}`;
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
else
{
    exports.ret = null;
}
