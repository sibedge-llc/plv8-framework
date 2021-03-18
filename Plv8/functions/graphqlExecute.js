let apiFunctions = [];
/*API*/
apiFunctions = ['gqlquery'];

/*SQL
DROP FUNCTION IF EXISTS graphql.execute;
CREATE OR REPLACE FUNCTION graphql.execute(query text, schema text)
RETURNS JSONB
SQL*/

const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.graphqlExecute);

const { query, schema } = args;

let api = {};
apiFunctions.map(f => api = { ...api, ...require(`../api/${f}.js`) });

/*BEGIN*/
var operators =
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

var idField = 'Id';
var idPostfix = 'Id';
var aggPostfix = 'Agg';

var aggFunctions = ['max', 'min', 'avg', 'sum'];
var aggFuncPrefix = (aggPostfix[0] === '_') ? '_' : '';
var aggDict = {};
aggFunctions.map(x => aggDict[x + aggFuncPrefix] = `${x.toUpperCase()}($)`);
aggDict['distinct' + aggFuncPrefix] = `array_agg(DISTINCT($))`;

var aliases = plv8.execute('SELECT * FROM graphql.aliases;');

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
    var qraphqlFilter = '';

    var args = args.filter(x => x.name.value === 'filter');
    if (args.length > 0)
    {
        var filter = args[0];

        var filterParts = filter.value.fields
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
                    var value1 = (filterVal.value.fields[0].value.kind === 'StringValue')
                        ? ((filterVal.value.fields[0].name.value === 'contains' || filterVal.value.fields[0].name.value === 'notContains')
                            ? `'%${filterVal.value.fields[0].value.value}%'`
                            : `'${filterVal.value.fields[0].value.value}'`)
                        : filterVal.value.fields[0].value.value;

                    var operator = operators[filterVal.value.fields[0].name.value];
                    
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
    var table = selection.selectionSet;
    var tableKeys = table.selections.map(x => x.name.value);

    var fkQuery = `SELECT * FROM graphql.schema_foreign_keys WHERE table_name='${tableName}' OR foreign_table_name='${tableName}';`;
    //--plv8.elog(NOTICE, fkQuery);

    var fkRowsAll = plv8.execute(fkQuery);

    var fkRows = fkRowsAll.filter(x => x.column_name.length > idPostfix.length).filter(function (item)
    {
        return item.table_name === tableName
            && tableKeys.includes(item.column_name.substr(0, item.column_name.length - idPostfix.length));
    });

    var fkFields = fkRows.map(function (a, index) { return a.column_name });
    var allFields = fkFields.concat(tableKeys);
    var allFieldsFiltered = allFields.filter(function (item, pos) { return allFields.indexOf(item) === pos });

    var sysQuery = "SELECT column_name FROM graphql.schema_columns WHERE "
        + `table_name='${tableName}' AND column_name IN('${allFieldsFiltered.join("', '")}');`;

    //--plv8.elog(NOTICE, sysQuery);
    var usedAliases = aliases.filter(a => allFieldsFiltered.includes(a.alias));

    var rows = plv8.execute(sysQuery);

    var items = [];

    var qraphqlFilter = '';
    var qraphqlFilter0 = '';
    var idFilterValue = -1;
    var orderBy = '';
    var limit = '';

    //-- grapghql filters
    if (selection.arguments !== undefined)
    {
        qraphqlFilter = getFilter(selection.arguments, level);
        if (level === 1)
        {
            qraphqlFilter0 = qraphqlFilter;
        }

        var idFilterArgs = selection.arguments.filter(x => x.name.value === 'id');
        if (level === 1 && idFilterArgs.length > 0)
        {
            var idFilter = idFilterArgs[0];
            qraphqlFilter = `a1."${idField}"=` + idFilter.value.value;
        }

        var orderArgs = selection.arguments.filter(x => x.name.value === 'orderBy');
        var orderDescArgs = selection.arguments.filter(x => x.name.value === 'orderByDescending');
        if (orderArgs.length > 0)
        {
            var order = orderArgs[0];
            orderBy = ` ORDER BY a${level}."${order.value.value}"`;
        }
        else if (orderDescArgs.length > 0)
        {
            var orderDesc = orderDescArgs[0];
            orderBy = ` ORDER BY a${level}."${orderDesc.value.value}" DESC`;
        }

        var skipArgs = selection.arguments.filter(x => x.name.value === 'skip');
        var takeArgs = selection.arguments.filter(x => x.name.value === 'take');
        if (takeArgs.length > 0)
        {
            var take = takeArgs[0];
            limit = ' LIMIT ' + take.value.value;
        }
        if (skipArgs.length > 0)
        {
            var skip = skipArgs[0];
            limit += ' OFFSET ' + skip.value.value;
        }
    }

    // --------------- Main part -----------------
    var sqlOperator = '';
    if (qraphqlFilter.length > 0)
    {
        sqlOperator = (where.length > 0) ? ' AND' : ' WHERE';
    }

    if (rows.length >= 0)
    {
        var fields = (usedAliases.length > 0)
            ? rows.map(a =>
            {
                var alias = usedAliases.find(x => x.alias === a.column_name);
                return (alias !== undefined)
                    ? `a${level}."${alias.column_name}" AS "${alias.alias}"`
                    : `a${level}."${a.column_name}"`;
            })
            : rows.map(a => `a${level}."${a.column_name}"`);

        var aggExist = false;

        var fkReverseRows = fkRowsAll.filter(item =>
        {
            var isAggField = tableKeys.includes(item.table_name + aggPostfix);
            aggExist = aggExist || isAggField;

            return item.foreign_table_name === tableName
                && (tableKeys.includes(item.table_name) || isAggField);
        });

        if (fields.length < 1 || aggExist)
        {
            fields.push(`"${idField}"`);
        }

        var query = `SELECT ${fields.join(", ")} FROM ${schema}."${tableName}" a${level} ${where}${sqlOperator}${qraphqlFilter}${orderBy}${limit};`;

        plv8.elog(NOTICE, query);

        items = plv8.execute(query);

        fkRows.filter(x => x.column_name.length > idPostfix.length).map(fkRow =>
        {
            table.selections.map(field =>
            {
                if (field.name.value.toLowerCase() === fkRow.column_name.substr(0, fkRow.column_name.length - idPostfix.length).toLowerCase())
                {
                    var ids = items.map(a => a[fkRow.column_name]).filter(item => item !== null).filter(distinct);
                    if (ids.length > 0)
                    {
                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        var subResult = {};
                        var subResultOrdered = {};

                        var innerWhere = (level === 2 && ids.length > 6500)
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
                    var subResult = {};
                    var subResultOrdered = {};

                    sqlOperator = '';
                    if (level === 1 && qraphqlFilter0.length > 0)
                    {
                        sqlOperator = (where.length > 0) ? ' AND' : ' WHERE';
                        if (!qraphqlFilter0.trim().startsWith('a1.'))
                        {
                            qraphqlFilter0 = ` a1.${qraphqlFilter0}`;
                        }
                    }

                    var alias = aliases.find(x => x.alias === fkReverseRow.column_name);
                    var reverse_column_name = (alias !== undefined)
                        ? alias.column_name
                        : fkReverseRow.column_name;

                    var innerWhere =
                        ` JOIN ${schema}."${tableName}" a${level} ON a${level}."${fkReverseRow.foreign_column_name}"=a${level + 1}."${reverse_column_name}" 
                ${where}${sqlOperator}${qraphqlFilter0}`;

                    if (limit.length > 0)
                    {
                        sqlOperator = (where.length > 0) || (qraphqlFilter0.length > 0)
                            ? ' AND' : ' WHERE';
                        var ids = items.map(a => a[idField]);

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
                        var newSelection = {
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
                        subResult[fkReverseRow.table_name].map(function (a, index)
                        {
                            subResultOrdered[a[fkReverseRow.column_name]] = subResultOrdered[a[fkReverseRow.column_name]] || [];
                            subResultOrdered[a[fkReverseRow.column_name]].push(a);
                        });
                    }

                    items.map(item => { item[field.name.value] = subResultOrdered[item[idField]]; });
                }
                else if (field.name.value.toLowerCase() === (fkReverseRow.table_name + aggPostfix).toLowerCase())
                {
                    var aggResult = {};
                    var aggWhere =
                        ` JOIN ${schema}."${tableName}" a${level} ON a${level}."${fkReverseRow.foreign_column_name}"=a${level + 1}."${fkReverseRow.column_name}" 
                ${where}${sqlOperator}${qraphqlFilter0}`;

                    if (limit.length > 0)
                    {
                        sqlOperator = (where.length > 0) || (qraphqlFilter0.length > 0)
                            ? ' AND' : ' WHERE';
                        var ids = items.map(a => a[idField]);

                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        aggWhere += ` ${sqlOperator} a${level}."${idField}" IN(${ids.join(', ')})`;
                    }

                    var aggResult = executeAgg(field, field.name.value, aggResult, aggWhere, level + 1, `a${level + 1}."${fkReverseRow.column_name}"`);
                    var aggResultOrdered = {};

                    aggResult.map(x =>
                    {
                        aggResultOrdered[x[fkReverseRow.column_name]] = x;
                        delete x[fkReverseRow.column_name];
                    });

                    var defaultAgg = {};
                    var fields = field.selectionSet.selections.map(x => x.name.value);
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
    var fields = {};
    selection.selectionSet.selections.map(s =>
    {
        var x = s.name.value;
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

    var aggSelect = (aggColumn.length > 0) ? (aggColumn + ', ') : '';
    var groupBy = (aggColumn.length > 0) ? ` GROUP BY ${aggColumn}` : '';
    var fieldsSelect = Object.keys(fields).map(k => `${fields[k]} AS "${k}"`).join(', ');

    var qraphqlFilter = (selection.arguments !== undefined)
        ? getFilter(selection.arguments, level)
        : '';

    var sqlOperator = '';
    if (qraphqlFilter.length > 0)
    {
        sqlOperator = (where.length > 0) ? ' AND' : ' WHERE';
    }

    var aggQuery = `SELECT ${aggSelect}${fieldsSelect} FROM ${schema}."${tableName.substr(0, tableName.length - aggPostfix.length)}" a${level}
    ${where}${sqlOperator}${qraphqlFilter}${groupBy};`;
    plv8.elog(NOTICE, aggQuery);

    return plv8.execute(aggQuery);
}

var result = {};

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
