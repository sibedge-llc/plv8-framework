let apiFunctions = [];
/*API*/
apiFunctions = ['gqlquery', 'accessLevels'];

/*SQL
DROP FUNCTION IF EXISTS graphql.execute;
CREATE OR REPLACE FUNCTION graphql.execute(query text, schema text, "userId" integer)
RETURNS JSONB
SQL*/

const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.graphqlExecute);

const { query, schema, userId } = args;

let api = {};
apiFunctions.map(f => api = { ...api, ...require(`../api/${f}.js`) });

/*BEGIN*/
const isAdmin = !userId && userId !== 0;

const operators =
{
    less: '<',
    greater: '>',
    lessOrEquals: '<=',
    greaterOrEquals: '>=',
    contains: ' ILIKE ',
    notContains: ' NOT ILIKE ',
    arrayContains: ' = ANY',
    arrayNotContains: ' != ALL'
};

const idField = 'id';
const idPostfix = '_id';
const aggPostfix = '_agg';

const aggFunctions = ['max', 'min', 'avg', 'sum'];
const aggFuncPrefix = (aggPostfix[0] === '_') ? '_' : '';
const aggDict = {};
aggFunctions.map(x => aggDict[x + aggFuncPrefix] = `${x.toUpperCase()}($)`);
aggDict['distinct' + aggFuncPrefix] = `array_agg(DISTINCT($))`;

const aliases = plv8.execute('SELECT * FROM graphql.aliases;');

function distinct(value, index, self)
{
    return self.indexOf(value) === index;
}

String.prototype.trim = function ()
{
    return this.replace(/^\s+|\s+$/g, "");
};

function getFilter(args, level)
{
    let qraphqlFilter = '';

    args = args.filter(x => x.name.value === 'filter');
    if (args.length > 0)
    {
        const filter = args[0];

        const filterParts = filter.value.fields
            .filter(x => x !== undefined)
            .map(filterVal =>
            {
                if (filterVal.value.kind !== 'ObjectValue')
                {
                    return (filterVal.value.kind === 'StringValue')
                        ? `a${level}."${filterVal.name.value}"='${filterVal.value.value}'`
                        : `a${level}."${filterVal.name.value}"=${filterVal.value.value}`;
                }
                else
                {
                    const value1 = (filterVal.value.fields[0].value.kind === 'StringValue')
                        ? ((filterVal.value.fields[0].name.value === 'contains' || filterVal.value.fields[0].name.value === 'notContains')
                            ? `'%${filterVal.value.fields[0].value.value}%'`
                            : `'${filterVal.value.fields[0].value.value}'`)
                        : filterVal.value.fields[0].value.value;

                        const operator = operators[filterVal.value.fields[0].name.value];
                    
                    if (operator === operators.arrayContains
                           || operator === operators.arrayNotContains)
                    {
                        return `${value1}${operator}(a${level}."${filterVal.name.value}")`;
                    }

                    return `a${level}."${filterVal.name.value}"${operator}${value1}`;
                }
            });

        if (filterParts.length > 0)
        {
            qraphqlFilter = ' ' + filterParts.join(' AND ');
        }
    }

    return qraphqlFilter;
}

function viewTable(selection, tableName, result, where, level)
{
    const table = selection.selectionSet;
    const tableKeys = table.selections.map(x => x.name.value);

    const fkQuery = `SELECT * FROM graphql.schema_foreign_keys WHERE table_name='${tableName}' OR foreign_table_name='${tableName}';`;
    //--plv8.elog(NOTICE, fkQuery);

    const fkRowsAll = plv8.execute(fkQuery);

    const fkRows = fkRowsAll.filter(x => x.column_name.length > idPostfix.length).filter(function (item)
    {
        return item.table_name === tableName
            && tableKeys.includes(item.column_name.substr(0, item.column_name.length - idPostfix.length));
    });

    const fkFields = fkRows.map(function (a, index) { return a.column_name });
    const allFields = fkFields.concat(tableKeys);
    const allFieldsFiltered = allFields.filter(function (item, pos) { return allFields.indexOf(item) === pos });

    const sysQuery = "SELECT column_name FROM graphql.schema_columns WHERE "
        + `table_name='${tableName}' AND column_name IN('${allFieldsFiltered.join("', '")}');`;

    //--plv8.elog(NOTICE, sysQuery);
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
        qraphqlFilter = getFilter(selection.arguments, level);
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
            orderBy = ` ORDER BY a${level}."${order.value.value}"`;
        }
        else if (orderDescArgs.length > 0)
        {
            const orderDesc = orderDescArgs[0];
            orderBy = ` ORDER BY a${level}."${orderDesc.value.value}" DESC`;
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
    let sqlOperator = '';
    if (qraphqlFilter.length > 0)
    {
        sqlOperator = (where.length > 0) ? ' AND' : ' WHERE';
    }

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

        const query = `SELECT ${fields.join(", ")} FROM ${schema}."${tableName}" a${level} ${where}${sqlOperator}${qraphqlFilter}${orderBy}${limit};`;

        plv8.elog(NOTICE, query);

        items = plv8.execute(query);

        fkRows.filter(x => x.column_name.length > idPostfix.length).map(fkRow =>
        {
            table.selections.map(field =>
            {
                if (field.name.value.toLowerCase() === fkRow.column_name.substr(0, fkRow.column_name.length - idPostfix.length).toLowerCase())
                {
                    const ids = items.map(a => a[fkRow.column_name]).filter(item => item !== null).filter(distinct);
                    if (ids.length > 0)
                    {
                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        const subResult = {};
                        const subResultOrdered = {};

                        const innerWhere = (level === 2 && ids.length > 6500)
                            ? ` JOIN ${schema}."${tableName}" a${level} ON a${level}."${fkRow.column_name}"=a${level + 1}."${fkRow.foreign_column_name}" ${where}`
                            : ` WHERE a${level + 1}."${fkRow.foreign_column_name}" IN(${ids.join(', ')})`;

                        viewTable(field, fkRow.foreign_table_name, subResult, innerWhere, level + 1);

                        subResult[fkRow.foreign_table_name].map(a => subResultOrdered[a[fkRow.foreign_column_name]] = a);
                        items.map(item => item[field.name.value] = subResultOrdered[item[fkRow.column_name]]);
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

                    const innerWhere =
                        ` JOIN ${schema}."${tableName}" a${level} ON a${level}."${fkReverseRow.foreign_column_name}"=a${level + 1}."${reverse_column_name}" 
                ${where}${sqlOperator}${qraphqlFilter0}`;

                    if (limit.length > 0)
                    {
                        sqlOperator = (where.length > 0) || (qraphqlFilter0.length > 0)
                            ? ' AND' : ' WHERE';
                        const ids = items.map(a => a[idField]);

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

                    if (subResult[fkReverseRow.table_name] !== undefined)
                    {
                        subResult[fkReverseRow.table_name].map((a, index) =>
                        {
                            subResultOrdered[a[fkReverseRow.column_name]] = subResultOrdered[a[fkReverseRow.column_name]] || [];
                            subResultOrdered[a[fkReverseRow.column_name]].push(a);
                        });
                    }

                    items.map(item => { item[field.name.value] = subResultOrdered[item[idField]]; });
                }
                else if (field.name.value.toLowerCase() === (fkReverseRow.table_name + aggPostfix).toLowerCase())
                {
                    let aggResult = {};
                    let aggWhere =
                        ` JOIN ${schema}."${tableName}" a${level} ON a${level}."${fkReverseRow.foreign_column_name}"=a${level + 1}."${fkReverseRow.column_name}" 
                            ${where}${sqlOperator}${qraphqlFilter0}`;

                    if (limit.length > 0)
                    {
                        sqlOperator = (where.length > 0) || (qraphqlFilter0.length > 0)
                            ? ' AND' : ' WHERE';
                            const ids = items.map(a => a[idField]);

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

    if (items.length > 0)
    {
        result[tableName] = (idFilterValue >= 0) ? items[0] : items;
    }
}

function executeAgg(selection, tableName, result, where, level, aggColumn)
{
    const fields = {};
    selection.selectionSet.selections.map(s =>
    {
        const x = s.name.value;
        if (x === 'count')
        {
            fields.count = 'COUNT(*)';
        }
        else
        {
            Object.keys(aggDict).map(key =>
            {
                if (x.length > key.length && x.substr(0, key.length) === key)
                {
                    fields[x] = aggDict[key].replace('$', `a${level}."${x.substr(key.length)}"`);
                }
            });
        }
    });

    const aggSelect = (aggColumn.length > 0) ? (aggColumn + ', ') : '';
    const groupBy = (aggColumn.length > 0) ? ` GROUP BY ${aggColumn}` : '';
    const fieldsSelect = Object.keys(fields).map(k => `${fields[k]} AS "${k}"`).join(', ');

    const qraphqlFilter = (selection.arguments !== undefined)
        ? getFilter(selection.arguments, level)
        : '';

    let sqlOperator = '';
    if (qraphqlFilter.length > 0)
    {
        sqlOperator = (where.length > 0) ? ' AND' : ' WHERE';
    }

    const aggQuery = `SELECT ${aggSelect}${fieldsSelect} FROM ${schema}."${tableName.substr(0, tableName.length - aggPostfix.length)}" a${level}
    ${where}${sqlOperator}${qraphqlFilter}${groupBy};`;
    plv8.elog(NOTICE, aggQuery);

    return plv8.execute(aggQuery);
}

const result = {};

api.gqlquery(query).definitions[0].selectionSet.selections.map(x =>
{
    if (x.name.value.length > aggPostfix.length
        && x.name.value.substr(x.name.value.length - aggPostfix.length) === aggPostfix)
    {
        result[x.name.value] = executeAgg(x, x.name.value, result, '', 1, '')[0];
    }
    else
    {
        viewTable(x, x.name.value, result, '', 1);
    }
});

exports.ret = { data: result };
