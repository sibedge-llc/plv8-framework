const configuration = {
    declare: {
        name: 'plv8.sql_change',
        args: {
            tableName: 'text',
            entities: 'jsonb',
            idKeys: 'text[]',
            operation: 'text',
            schema: 'text',
            user: 'jsonb'
        }
    },
    apiFunctions: ['accessLevels']
};

/*LOCAL*/
const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.sqlChange);

const { tableName, entities, idKeys, operation, schema, user } = args;

const api = top.createApi(configuration);

/*BEGIN*/
const isAdmin = !user || !user.isAnonymous && !user.userId;
const userId = !isAdmin ? user.userId : null;
const authInfo = isAdmin ? [] : plv8.execute(api.authQuery);

const upsert = operation === "update";
const del = operation === "delete";

const fullTableName = schema
    ? `${plv8.quote_ident(schema)}.${plv8.quote_ident(tableName)}`
    : plv8.quote_ident(tableName);

function isString(val)
{
    (typeof val === 'string' || val instanceof String)
}

function getAuthInfo(tableName)
{
    return api.getWriteAuthInfo(tableName, authInfo, user);
}

function getFields(keys)
{
    return keys.map(x => plv8.quote_ident(x));
}

function getFieldsSql()
{
    const ret = `(${fields.join(', ')})`;
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

    if (type === 'object' || type === 'array')
    {
        return `${plv8.quote_nullable(JSON.stringify(value))}::jsonb`;
    }

    return plv8.quote_nullable(value);
}

function getValues(entity, keys)
{
    return keys.map(key => getValueSql(entity[key]));
}

function getValuesSql(valuesArr)
{
    return `(${valuesArr.join(', ')})`;
}

function changeUserIdField(entity)
{
    entity[api.userField] = userId;
}

function createConditionFilter(condition)
{
    const orName = 'or';

    const parts = Object.keys(condition)
        .filter(key => key !== orName)
        .map(field =>
    {
        const filter = condition[field];
        const filterParts = Object.keys(filter).map(operatorName =>
        {
            const operator = api.operators[operatorName];
            const value = filter[operatorName];

            const values = Array.isArray(value)
                ? value.map(x => ({ isString: isString(x), value: x }))
                : [];

            if (api.isArrayOperator(operator))
            {
                return `${value}${operator}(${field})`;
            }
            else
            {
                const sqlValue = api.getOperatorValue(operatorName, value, values, isString(value));
                return `${field}${operator}${sqlValue}`;
            }
        });

        return filterParts.join(' AND ');
    });

    if (orName in condition)
    {
        const orFilters = condition[orName].map(x =>
        {
            return createConditionFilter(x);
        });

        const orFilter = `(${orFilters.join(' OR ')})`;
        parts.push(orFilter);
    }

    return parts.join(' AND ');
}

let fields = [];
let values = [];
const multiMode = Array.isArray(entities);
const update = upsert && !multiMode;
const conditionFilter = userId && user.condition;

const { writeAllowed, userFilter } = getAuthInfo(tableName);

const userWhere = userFilter
    ? ` AND ${api.userField}=${userId}`
    : '';

const conditionWhere = conditionFilter
    ? ` AND ${createConditionFilter(user.condition)}`
    : '';

function getUpdateExpr(entity)
{
    const updateExpr = Object.keys(entity)
        .filter(x => !idKeys.includes(x))
        .map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(', ');

    const where = idKeys.map(x => `${plv8.quote_ident(x)}=${getValueSql(entity[x])}`).join(' AND ');

    return `UPDATE ${fullTableName} SET ${updateExpr} WHERE ${where}${userWhere}${conditionWhere}`;
}

function getInsertSql()
{
    const valuesRows = values.map(x => getValuesSql(x));
    return `INSERT INTO ${fullTableName} ${getFieldsSql()} VALUES ${valuesRows.join(', ')}`;
}

function addFilterFields(entity)
{
    Object.keys(conditionFilter).forEach(key =>
    {
        const conditions = conditionFilter[key];
        const condKeys = Object.keys(conditions);

        if (condKeys.length === 1 && !(key in entity))
        {
            const [operator] = condKeys;
            if (operator === 'equals')
            {
                entity[key] = conditions[operator];
            }
            else if (operator === 'isNull')
            {
                entity[key] = null;
            }
        }
    });
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

if (!upsert && !del && conditionFilter)
{
    if (multiMode)
    {
        entities.forEach(e => addFilterFields(e));
    }
    else
    {
        addFilterFields(entities);
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
        const allKeyObj = {};
        
        entities.forEach(e => Object.keys(e)
            .filter(k => !(k in allKeyObj))
            .forEach(k => allKeyObj[k] = true));        
        
        const keys = Object.keys(allKeyObj);
        fields = getFields(keys);
        values = entities.map(x => getValues(x, keys));
    }
}
else
{
    const keys = Object.keys(entities);
    fields = getFields(keys);
    values.push(getValues(entities, keys));
}

if (!writeAllowed)
{
    exports.ret = null;
}
else if (values.length > 0)
{
    let sql = '';
    let sqlReturning = '';
    let needExecute = true;

    if (idKeys && idKeys.length)
    {
        const entity = multiMode ? entities[0] : entities;

        if (update)
        {
            sql = getUpdateExpr(entity);
        }
        else if (upsert && (userFilter || conditionFilter))
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
            sql = getInsertSql();
        
            if (upsert)
            {
                const updateExpr = Object.keys(entity)
                    .filter(x => !idKeys.includes(x))
                    .map(x => `${plv8.quote_ident(x)}=EXCLUDED.${plv8.quote_ident(x)}`).join(', ');

                sql += ` ON CONFLICT (${keys}) DO UPDATE SET ${updateExpr}`;
            }

            sqlReturning = ` RETURNING ${keys}`;
        }
    }

    if (!upsert && !del)
    {
        if (conditionFilter)
        {
            const cteBody = values
                .map(row => `SELECT ${row.map((v, i) => `${v} AS ${fields[i]}`).join(', ')}`)
                .join(' UNION ALL ');

            const cte = `WITH s AS (${cteBody})`;
            let condition = `${userWhere}${conditionWhere}`;

            if (condition.startsWith(' AND '))
            {
                condition = ` WHERE ${condition.substring(5)}`;
            }

            sql = `${cte} INSERT INTO ${fullTableName} ${getFieldsSql()} SELECT * FROM s${condition}`;
        }
        else
        {
            sql = getInsertSql();
        }
    }

    sql += sqlReturning;

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

    sql = `DELETE FROM ${fullTableName} WHERE (${where})${userWhere}${conditionWhere}`;

    plv8.elog(NOTICE, sql);
    exports.ret = plv8.execute(sql);
}
else
{
    exports.ret = null;
}
