let apiFunctions = [];
/*API*/
apiFunctions = ['gqlquery', 'accessLevels'];

/*SQL
DROP FUNCTION IF EXISTS graphql.execute;
CREATE OR REPLACE FUNCTION graphql.execute(query text, schema text, "user" jsonb)
RETURNS JSONB
SQL*/

const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.graphqlExecute);

const { query, user } = args;
let { schema } = args;

let api = {};
apiFunctions.map(f => api = { ...api, ...require(`../api/${f}.js`) });

/*BEGIN*/
const isAdmin = !user || !user.isAnonymous && !user.userId;
const isAnonymous = !isAdmin && user.isAnonymous;
const userId = !isAdmin ? user.userId : null;
const isUser = userId > 0;

if (!schema)
{
    schema = '';
}
else if (schema.length > 0)
{
    schema += '.';
}

const operators =
{
    equals: '=',
    notEquals: '!=',
    less: '<',
    greater: '>',
    lessOrEquals: '<=',
    greaterOrEquals: '>=',
    contains: ' ILIKE ',
    notContains: ' NOT ILIKE ',
    starts: ' ILIKE ',
    ends: ' ILIKE ',
    arrayContains: ' = ANY',
    arrayNotContains: ' != ALL',
    in: ' IN ',
    isNull: ' IS '
};

const idField = 'id';
const idPostfix = '_id';
const aggPostfix = '_agg';
const userField = 'account_id';

const aggFunctions = ['max', 'min', 'avg', 'sum'];
const aggFuncPrefix = (aggPostfix[0] === '_') ? '_' : '';
const aggDict = {};
aggFunctions.map(x => aggDict[x + aggFuncPrefix] = `${x.toUpperCase()}($)`);
aggDict['distinct' + aggFuncPrefix] = `array_agg(DISTINCT($))`;

const aliases = plv8.execute('SELECT * FROM graphql.aliases;');

const authInfo = isAdmin
    ? []
    : plv8.execute('SELECT * FROM graphql.authorize;');

const fkData = {};

function getTableLevels(tableName)
{
    let tableLevels = authInfo.filter(x => x.table_name === tableName);

    if (!tableLevels.length)
    {
        tableLevels = authInfo.filter(x => x.table_name === api.accessLevels.DEFAULT_KEY);
    }

    return tableLevels;
}

function getAuthInfo(tableName, level)
{
    let readAllowed = isAdmin;
    let userFilter = false;

    if (!readAllowed)
    {
        let tableLevels = getTableLevels(tableName);

        if (!tableLevels.length)
        {
            readAllowed = true;
        }
        else
        {
            const [tableLevel] = tableLevels;
            const requiredLevel = isAnonymous ? api.accessLevels.ANON_READ : api.accessLevels.USER_READ;
            readAllowed = tableLevel.access_level & requiredLevel;

            if (!readAllowed && isUser && (tableLevel.access_level & api.accessLevels.USER_READ_OWN))
            {
                readAllowed = true;
                userFilter = true;
            }

            if (!readAllowed && (tableLevel.access_level & api.accessLevels.RELATED_READ))
            {
                readAllowed = level > 1;
            }
        }
    }

    return { readAllowed, userFilter };
}

function getFkData(tableName)
{
    if (tableName in fkData)
    {
        return fkData[tableName];
    }

    const fkQuery = `SELECT * FROM graphql.schema_foreign_keys WHERE table_name='${tableName}' OR foreign_table_name='${tableName}';`;
    const fkRowsAll = plv8.execute(fkQuery);

    fkData[tableName] = fkRowsAll;
    return fkRowsAll;
}

function distinct(value, index, self)
{
    return self.indexOf(value) === index;
}

String.prototype.trim = function ()
{
    return this.replace(/^\s+|\s+$/g, "");
};

function canBeRelated(columnName)
{
    return columnName.length > idPostfix.length;
}

function getRelatedName(columnName)
{
    return columnName.substr(0, columnName.length - idPostfix.length);
}

function getOperatorPart(filterField, fieldName)
{
    const operatorName = filterField.name.value;
    const kind = filterField.value.kind;
    const operator = operators[operatorName];
    let value = filterField.value.value;

    if (operator === operators.arrayContains
           || operator === operators.arrayNotContains)
    {
        return `${value}${operator}(${fieldName})`;
    }
    else if (operatorName === 'starts')
    {
        value = `'${filterField.value.value}%'`;
    }
    else if (operatorName === 'ends')
    {
        value = `'%${filterField.value.value}'`;
    }
    else if (operator === operators.contains || operator === operators.notContains)
    {
        value = `'%${filterField.value.value}%'`;
    }
    else if (operator === operators.isNull)
    {
        value = `${value ? '' : 'NOT '}NULL`;
    }
    else if (operator === operators.in)
    {
        value = `(${filterField.value.values
            .map(x => x.value)
            .join(', ')})`;
    }
    else if (kind === 'StringValue')
    {
        value = `'${filterField.value.value}'`;
    }    

    return `${fieldName}${operator}${value}`;
}

function getFilter(args, level, fkRows)
{
    const relatedNames = fkRows
       .filter(x => canBeRelated(x.column_name))
       .map(x => getRelatedName(x.column_name));

    let qraphqlFilter = '';

    args = args.filter(x => x.name.value === 'filter');

    if (args.length)
    {
        const [filter] = args;
        let filterParts = [];

        filter.value.fields
            .filter(x => x !== undefined && !relatedNames.includes(x.name.value))
            .map(filterVal =>
            {
                if (filterVal.value.kind === 'NullValue')
                {
                    filterParts.push(`a${level}."${filterVal.name.value}" IS NULL`);
                }
                else if (filterVal.value.kind !== 'ObjectValue')
                {
                    filterParts.push((filterVal.value.kind === 'StringValue')
                        ? `a${level}."${filterVal.name.value}"='${filterVal.value.value}'`
                        : `a${level}."${filterVal.name.value}"=${filterVal.value.value}`);
                }
                else
                {
                    const fieldName = `a${level}."${filterVal.name.value}"`;

                    filterVal.value.fields.map(filterField =>
                    {
                        filterParts.push(getOperatorPart(filterField, fieldName));
                    });
                }
            });

        if (filterParts.length > 0)
        {
            qraphqlFilter = ' ' + filterParts.join(' AND ');
        }
    }

    return qraphqlFilter;
}

function getAggFieldSql(field)
{
    if (field === 'count')
    {
        return {
            func: 'COUNT(*)',
            key: ''
        };
    }
    else
    {
        let ret = null;

        Object.keys(aggDict).map(key =>
        {
            if (field.length > key.length && field.substr(0, key.length) === key)
            {
                ret = {
                    func: aggDict[key],
                    key
                };
            }
        });

        return ret;
    }
}

function getAggFilter(args, level)
{
    let qraphqlFilter = '';

    args = args.filter(x => x.name.value === 'aggFilter');

    if (args.length)
    {
        const [filter] = args;
        let filterParts = [];

        filter.value.fields
            .filter(x => x !== undefined)
            .map(filterVal =>
            {
                const aggField = getAggFieldSql(filterVal.name.value);
                const fieldName = aggField.func
                    .replace('$', `${filterVal.name.value.substr(aggField.key.length)}`)

                const fieldNameFull = `a${level}."${fieldName}"`;

                filterVal.value.fields.map(filterField =>
                {
                    filterParts.push(getOperatorPart(filterField, fieldNameFull));
                });
            });

        if (filterParts.length > 0)
        {
            qraphqlFilter = ' ' + filterParts.join(' AND ');
        }
    }

    return qraphqlFilter;
}

function getRelationFilter(args, fkRows)
{
    const relatedNames = fkRows
       .filter(x => canBeRelated(x.column_name))
       .map(x => getRelatedName(x.column_name));

    const ret = {};

    args = args.filter(x => x.name.value === 'filter');

    if (args.length)
    {
        const [filter] = args;

        filter.value.fields
            .filter(x => x !== undefined && relatedNames.includes(x.name.value))
            .map(x => ret[x.name.value] = x.value.value);
    }

    return ret;
}

function processInheritFilters(selection, fkRows, otherFilter, level)
{
    const table = selection.selectionSet;

    const ret = {
        relationFilter: getRelationFilter(selection.arguments, fkRows),
        relatableFkRows: fkRows.filter(x => canBeRelated(x.column_name))
    };

    ret.relationFilterKeys = Object.keys(ret.relationFilter);
    ret.relFilter = '';
    ret.relWhere = '';
   
    ret.relationFilterKeys
        .filter(x => ret.relationFilter[x])
        .map(x =>
        {
            const [fkRow] = ret.relatableFkRows
                .filter(fkRow => getRelatedName(fkRow.column_name).toLowerCase() === x.toLowerCase());

            const relOperator = (otherFilter.length || relFilter.length) ? ' AND' : '';
            ret.relFilter += ` JOIN ${schema}"${fkRow.foreign_table_name}" a${level + 1} ON a${level}."${fkRow.column_name}"=a${level + 1}."${fkRow.foreign_column_name}"`;

            const [selectionField] = table.selections
                .filter(field => field.name.value.toLowerCase() === x.toLowerCase());
            
            const relGraphqlFilter = getFilter(selectionField.arguments, level + 1, fkRows);

            if (relGraphqlFilter.length)
            {
                ret.relWhere += `${relOperator}${relGraphqlFilter}`;
            }
        });

    return ret;
}

function viewTable(selection, tableName, result, where, level)
{
    // Authorize
    const { readAllowed, userFilter } = getAuthInfo(tableName, level);

    if (!readAllowed)
    {
        result[tableName] = [];
        return;
    }

    const table = selection.selectionSet;
    const tableKeys = table.selections.map(x => x.name.value);

    const fkRowsAll = getFkData(tableName);
    const fkRows = fkRowsAll.filter(x => canBeRelated(x.column_name)).filter(function (item)
    {
        return item.table_name === tableName
            && tableKeys.includes(getRelatedName(item.column_name));
    });

    const fkFields = fkRows.map(function (a, index) { return a.column_name });
    const allFields = fkFields.concat(tableKeys);
    const allFieldsFiltered = allFields.filter(function (item, pos) { return allFields.indexOf(item) === pos });

    if (userFilter)
    {
        allFieldsFiltered.push(userField);
    }

    const sysQuery = "SELECT column_name FROM graphql.schema_columns WHERE "
        + `table_name='${tableName}' AND column_name IN('${allFieldsFiltered.join("', '")}');`;

    const usedAliases = aliases.filter(a => allFieldsFiltered.includes(a.alias));

    const rows = plv8.execute(sysQuery);

    let items = [];

    let qraphqlFilter = '';
    let qraphqlFilter0 = '';
    let idFilterValue = -1;
    let orderBy = '';
    let limit = '';

    //-- grapghql filters
    if (selection.arguments !== undefined)
    {
        qraphqlFilter = getFilter(selection.arguments, level, fkRows);
        if (level === 1)
        {
            qraphqlFilter0 = qraphqlFilter;
        }

        let idFilterArgs = selection.arguments.filter(x => x.name.value === 'id');
        if (level === 1 && idFilterArgs.length > 0)
        {
            const idFilter = idFilterArgs[0];
            qraphqlFilter = `a1."${idField}"=` + idFilter.value.value;
        }

        const orderArgs = selection.arguments.filter(x => x.name.value === 'orderBy');
        const orderDescArgs = selection.arguments.filter(x => x.name.value === 'orderByDescending');

        if (orderArgs.length > 0)
        {
            const order = orderArgs[0];
            
            const additionalOrder = order.value.value !== idField
                && rows.map(x => x.column_name).includes(idField)
                    ? `, a${level}."${idField}"` : "";

            orderBy = ` ORDER BY a${level}."${order.value.value}"${additionalOrder}`;
        }
        else if (orderDescArgs.length > 0)
        {
            const orderDesc = orderDescArgs[0];
            
            const additionalOrder = orderDesc.value.value !== idField
                && rows.map(x => x.column_name).includes(idField)
                ? `, a${level}."${idField}"` : "";

            orderBy = ` ORDER BY a${level}."${orderDesc.value.value}" DESC${additionalOrder}`;
        }

        const skipArgs = selection.arguments.filter(x => x.name.value === 'skip');
        const takeArgs = selection.arguments.filter(x => x.name.value === 'take');

        if (takeArgs.length > 0)
        {
            const take = takeArgs[0];
            limit = ' LIMIT ' + take.value.value;
        }
        if (skipArgs.length > 0)
        {
            const skip = skipArgs[0];
            limit += ' OFFSET ' + skip.value.value;
        }
    }

    // --------------- Main part -----------------
    if (rows.length >= 0)
    {
        const fields = (usedAliases.length > 0)
            ? rows.map(a =>
            {
                const alias = usedAliases.find(x => x.alias === a.column_name);
                return (alias !== undefined)
                    ? `a${level}."${alias.column_name}" AS "${alias.alias}"`
                    : `a${level}."${a.column_name}"`;
            })
            : rows.map(a => `a${level}."${a.column_name}"`);

        let aggExist = false;

        const fkReverseRows = fkRowsAll.filter(item =>
        {
            const isAggField = tableKeys.includes(item.table_name + aggPostfix);
            aggExist = aggExist || isAggField;

            return item.foreign_table_name === tableName
                && (tableKeys.includes(item.table_name) || isAggField);
        });

        if (fields.length < 1 || aggExist)
        {
            fields.push(`"${idField}"`);
        }

        // Relation objects filter by existing
        let query = `SELECT ${fields.join(", ")} FROM ${schema}"${tableName}" a${level}`;
        const inheritFilters = processInheritFilters(selection, fkRows, qraphqlFilter, level);

        let sqlOperator = '';
        if (qraphqlFilter.length || inheritFilters.relFilter.length)
        {
            sqlOperator = where.length ? ' AND' : ' WHERE';
        }

        let userWhere = '';

        if (userFilter && rows.filter(x => x.column_name === userField).length)
        {
            userWhere = (where.length || inheritFilters.relWhere.length || qraphqlFilter.length)
                ? ' AND'
                : ' WHERE';

            userWhere = `${userWhere} a${level}."${userField}"=${userId}`;            
        }

        query += `${inheritFilters.relFilter} ${where}${sqlOperator}${qraphqlFilter}${inheritFilters.relWhere}${userWhere}${orderBy}${limit}`;

        plv8.elog(NOTICE, query);
        items = plv8.execute(query);

        inheritFilters.relatableFkRows.map(fkRow =>
        {
            table.selections.map(field =>
            {
                const fieldNameLower = field.name.value.toLowerCase();

                if (fieldNameLower === getRelatedName(fkRow.column_name).toLowerCase())
                {
                    let ids = items.map(a => a[fkRow.column_name]).filter(item => item !== null).filter(distinct);
                    if (ids.length > 0)
                    {
                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        const subResult = {};
                        const subResultOrdered = {};

                        const innerWhere = (level === 2 && ids.length > 6500)
                            ? ` JOIN ${schema}"${tableName}" a${level} ON a${level}."${fkRow.column_name}"=a${level + 1}."${fkRow.foreign_column_name}" ${where}`
                            : ` WHERE a${level + 1}."${fkRow.foreign_column_name}" IN(${ids.join(', ')})`;

                        viewTable(field, fkRow.foreign_table_name, subResult, innerWhere, level + 1);

                        const subResultPart = subResult[fkRow.foreign_table_name];

                        if (subResultPart)
                        {
                            subResultPart.map(a => subResultOrdered[a[fkRow.foreign_column_name]] = a);
                        }

                        items.map(item => item[field.name.value] = subResultOrdered[item[fkRow.column_name]]);
                       
                        const currentRelations = inheritFilters.relationFilterKeys
                            .filter(x => x.toLowerCase() === fieldNameLower);

                        if (currentRelations.length)
                        {
                            const [relation] = currentRelations;
                            const relationValue = inheritFilters.relationFilter[relation];

                            items = items.filter(x => (x[relation] && relationValue)
                                || (!x[relation] && !relationValue));
                        }
                    }
                }
            });
        });

        fkReverseRows.map(fkReverseRow =>
        {
            table.selections.map(field =>
            {
                if (field.name.value.toLowerCase() === fkReverseRow.table_name.toLowerCase())
                {
                    const subResult = {};
                    const subResultOrdered = {};

                    sqlOperator = '';
                    if (level === 1 && qraphqlFilter0.length > 0)
                    {
                        sqlOperator = (where.length > 0) ? ' AND' : ' WHERE';
                        if (!qraphqlFilter0.trim().startsWith('a1.'))
                        {
                            qraphqlFilter0 = ` a1.${qraphqlFilter0}`;
                        }
                    }

                    const alias = aliases.find(x => x.alias === fkReverseRow.column_name);
                    const reverse_column_name = (alias !== undefined)
                        ? alias.column_name
                        : fkReverseRow.column_name;

                    let innerWhere =
                        ` JOIN ${schema}"${tableName}" a${level} ON a${level}."${fkReverseRow.foreign_column_name}"=a${level + 1}."${reverse_column_name}" 
                ${where}${sqlOperator}${qraphqlFilter0}`;

                    if (limit.length > 0)
                    {
                        sqlOperator = (where.length > 0) || (qraphqlFilter0.length > 0)
                            ? ' AND' : ' WHERE';
                        let ids = items.map(a => a[idField]);

                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        innerWhere += ` ${sqlOperator} a${level}."${idField}" IN(${ids.join(', ')})`;
                    }

                    if (field.selectionSet !== undefined
                        && field.selectionSet.selections !== undefined
                        && field.selectionSet.selections.filter(x => x.name.value === fkReverseRow.column_name).length < 1)
                    {
                        const newSelection = {
                            "kind": "Field",
                            "name": {
                                "kind": "Name",
                                "value": fkReverseRow.column_name
                            }
                        };
                        field.selectionSet.selections.push(newSelection);
                    }

                    viewTable(field, fkReverseRow.table_name, subResult, innerWhere, level + 1);

                    const subItems = subResult[fkReverseRow.table_name];

                    if (subItems !== undefined)
                    {
                        if (subItems.length)
                        {
                            subItems.map((a, index) =>
                            {
                                subResultOrdered[a[fkReverseRow.column_name]] = subResultOrdered[a[fkReverseRow.column_name]] || [];
                                subResultOrdered[a[fkReverseRow.column_name]].push(a);
                            });

                            items.map(item => { item[field.name.value] = subResultOrdered[item[idField]]; });
                        }
                        else
                        {
                            items.map(item => { item[field.name.value] = [] });
                        }
                    }                    
                }
                else if (field.name.value.toLowerCase() === (fkReverseRow.table_name + aggPostfix).toLowerCase())
                {
                    let aggResult = {};
                    let aggWhere =
                        ` JOIN ${schema}"${tableName}" a${level} ON a${level}."${fkReverseRow.foreign_column_name}"=a${level + 1}."${fkReverseRow.column_name}" 
                            ${where}${sqlOperator}${qraphqlFilter0}`;

                    if (limit.length > 0)
                    {
                        sqlOperator = (where.length > 0) || (qraphqlFilter0.length > 0)
                            ? ' AND' : ' WHERE';
                            let ids = items.map(a => a[idField]);

                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        aggWhere += ` ${sqlOperator} a${level}."${idField}" IN(${ids.join(', ')})`;
                    }

                    aggResult = executeAgg(field, field.name.value, aggResult, aggWhere, level + 1, `a${level + 1}."${fkReverseRow.column_name}"`);
                    const aggResultOrdered = {};

                    aggResult.map(x =>
                    {
                        aggResultOrdered[x[fkReverseRow.column_name]] = x;
                        delete x[fkReverseRow.column_name];
                    });

                    const defaultAgg = {};
                    const fields = field.selectionSet.selections.map(x => x.name.value);
                    if (fields.includes('count'))
                    {
                        defaultAgg.count = 0;
                    }

                    fields.filter(x => x.length > 'distinct'.length && x.substr(0, 'distinct'.length) === 'distinct')
                        .map(x => defaultAgg[x] = []);

                    items.map(item =>
                    {
                        if (aggResultOrdered[item[idField]] !== undefined)
                        {
                            item[field.name.value] = aggResultOrdered[item[idField]];
                        }
                        else
                        {
                            item[field.name.value] = defaultAgg;
                        }
                    });
                }
            });
        });
    }

    if (items.length > 0 && idFilterValue >= 0)
    {
        result[tableName] = items[0];
        return;
    }

    result[tableName] = items;
}

function executeAgg(selection, tableName, result, where, level, aggColumn)
{
    const realTableName = tableName.substr(0, tableName.length - aggPostfix.length);
    const useGroupBy = aggColumn.length > 0;

    // Authorize
    const { readAllowed, userFilter } = getAuthInfo(realTableName, level);

    if (!readAllowed && useGroupBy)
    {
        return [];
    }

    const emptyResult = {};
    const fields = {};
    let useKey = false;

    selection.selectionSet.selections.map(s =>
    {
        const x = s.name.value;

        if (!readAllowed)
        {
            emptyResult[x] = x === 'count' ? 0 : null;
        }
        else if (x === 'key')
        {
            useKey = true;
        }
        else
        {
            const aggField = getAggFieldSql(x);

            if (aggField)
            {
                fields[x] = aggField.func
                    .replace('$', `a${level}."${x.substr(aggField.key.length)}"`);
            }
        }
    });

    if (!readAllowed)
    {
        return [emptyResult];
    }

    const fieldKeys = Object.keys(fields);
    const aggSelect = useGroupBy ? (aggColumn + (fieldKeys.length ? ', ' : '')) : '';
    const groupBy = useGroupBy ? ` GROUP BY ${aggColumn}` : '';
    const fieldsSelect = fieldKeys.map(k => `${fields[k]} AS "${k}"`).join(', ');
    
    const fkRowsAll = getFkData(realTableName);

    const qraphqlFilter = (selection.arguments !== undefined)
        ? getFilter(selection.arguments, level, fkRowsAll)
        : '';

    const qraphqlAggFilter = (selection.arguments !== undefined)
        ? getAggFilter(selection.arguments, level)
        : '';

    const havingOperator = qraphqlAggFilter.length ? ' HAVING' : '';

    const inheritFilters = processInheritFilters(selection, fkRowsAll, qraphqlFilter, level);

    let sqlOperator = '';
    if (qraphqlFilter.length || inheritFilters.relFilter.length)
    {
        sqlOperator = where.length ? ' AND' : ' WHERE';
    }

    let userWhere = '';
    if (userFilter)
    {
        userWhere = (where.length || inheritFilters.relWhere.length || qraphqlFilter.length)
            ? ' AND'
            : ' WHERE';

        userWhere = `${userWhere} a${level}."${userField}"=${userId}`;            
    }

    const aggQuery = `SELECT ${aggSelect}${fieldsSelect} FROM ${schema}"${realTableName}" a${level} ${inheritFilters.relFilter}
        ${where}${sqlOperator}${qraphqlFilter}${inheritFilters.relWhere}${userWhere}${groupBy}${havingOperator}${qraphqlAggFilter};`;
    plv8.elog(NOTICE, aggQuery);

    const ret = plv8.execute(aggQuery);

    if (useKey)
    {
        ret.map(x =>
        {
            x.key = x[aggColumn];
            delete x[aggColumn];
        });
    }

    return ret;
}

const result = {};

api.gqlquery(query).definitions[0].selectionSet.selections.map(x =>
{
    if (x.name.value.length > aggPostfix.length
        && x.name.value.substr(x.name.value.length - aggPostfix.length) === aggPostfix)
    {
        const groupArgs = x.arguments.filter(x => x.name.value === 'groupBy');
        let groupBy = '';

        if (groupArgs.length > 0)
        {
            const [group] = groupArgs;
            groupBy = group.value.value;
        }

        result[x.name.value] = executeAgg(x, x.name.value, result, '', 1, groupBy);
    }
    else
    {
        viewTable(x, x.name.value, result, '', 1);
    }
});

exports.ret = { data: result };
