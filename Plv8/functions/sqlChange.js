let apiFunctions = [];
/*API*/
apiFunctions = ['accessLevels'];

/*SQL
DROP FUNCTION IF EXISTS plv8.sql_change;
CREATE OR REPLACE FUNCTION plv8.sql_change(
  "tableName" text,
  entities jsonb,
  "idKeys" text[],
  operation text,
  schema text,
  "user" jsonb)
RETURNS jsonb
SQL*/

const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.sqlChange);

const { tableName, idKeys, operation, schema, user } = args;
let entities = args.entities;

let api = {};
apiFunctions.map(f => api = { ...api, ...require(`../api/${f}.js`) });

/*BEGIN*/
const isAdmin = !user || !user.isAnonymous && !user.userId;
const userId = !isAdmin ? user.userId : null;
const authInfo = isAdmin ? [] : plv8.execute(api.authQuery);

const upsert = operation === "update";
const del = operation === "delete";

const fullTableName = schema
    ? `${plv8.quote_ident(schema)}.${plv8.quote_ident(tableName)}`
    : plv8.quote_ident(tableName);

function getAuthInfo(tableName)
{
    return api.getWriteAuthInfo(tableName, authInfo, user);
}    

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

function changeUserIdField(entity)
{
    entity[api.userField] = userId;
}

let fields = '';
let values = [];
const multiMode = Array.isArray(entities);
const update = upsert && !multiMode;

const { writeAllowed, userFilter } = getAuthInfo(tableName);

const userWhere = (userFilter && (upsert || del))
    ? ` AND ${api.userField}=${userId}`
    : '';

function getUpdateExpr(entity)
{
    const updateExpr = Object.keys(entity)
        .filter(x => !idKeys.includes(x))
        .map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(', ');

    const where = idKeys.map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(' AND ');

    return `UPDATE ${fullTableName} SET ${updateExpr} WHERE ${where}${userWhere}`;
}

if (userFilter && !del)
{
    if (multiMode)
    {
        entities.map(x => changeUserIdField(x));
    }
    else
    {
        changeUserIdField(entities);
    }
}

if (del)
{
    if (multiMode && entities.length < 1)
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

if (!writeAllowed)
{
    exports.ret = null;
}
else if (values.length > 0)
{
    let sql = `INSERT INTO ${fullTableName} ${fields} VALUES ${values.join(', ')}`;
    let needExecute = true;

    if (idKeys && idKeys.length)
    {
        const entity = multiMode ? entities[0] : entities;

        if (update)
        {
            sql = getUpdateExpr(entity);
        }
        else if (upsert && userFilter)
        {
            const ret = [];
            entities.map(e =>
                {
                    sql = getUpdateExpr(e);
                    plv8.elog(NOTICE, sql);

                    const result = plv8.execute(sql);
                    if (Array.isArray(result) && result.length && result[0])
                    {
                        const retItem = {};
                        idKeys.map(key => retItem[key] = e[key]);
                        ret.push(retItem);
                    }
                });

            needExecute = false;
            exports.ret = ret;
        }
        else
        {
            const keys = idKeys.map(x => plv8.quote_ident(x)).join(', ');
        
            if (upsert)
            {
                const updateExpr = Object.keys(entity)
                    .filter(x => !idKeys.includes(x))
                    .map(x => `${plv8.quote_ident(x)}=EXCLUDED.${plv8.quote_ident(x)}`).join(', ');

                sql += ` ON CONFLICT (${keys}) DO UPDATE SET ${updateExpr}`;
            }

            sql += ` RETURNING ${keys}`;
        }
    }

    if (needExecute)
    {
        plv8.elog(NOTICE, sql);
        exports.ret = plv8.execute(sql);
    }
}
else if (del && idKeys && idKeys.length)
{
    const newEntities = multiMode ? entities : [entities];
    const where = newEntities
        .map(e => idKeys.map(x => `(${plv8.quote_ident(x)}=${getValueSql(e[x])})`).join(' AND '))
        .join(' OR ');

    sql = `DELETE FROM ${fullTableName} WHERE (${where})${userWhere}`;

    plv8.elog(NOTICE, sql);
    exports.ret = plv8.execute(sql);
}
else
{
    exports.ret = null;
}
