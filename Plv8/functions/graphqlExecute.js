const configuration = {
    declare: {
        name: 'graphql.execute',
        args: {
            query: 'text',
            schema: 'text',
            user: 'jsonb'
        }
    },
    apiFunctions: ['gqlquery', 'accessLevels']
};

/*LOCAL*/
const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.graphqlExecute);

const { query, user } = args;
let { schema } = args;

const api = top.createApi(configuration);

/*BEGIN*/
const isAdmin = !user || !user.isAnonymous && !user.userId;
const userId = !isAdmin ? user.userId : null;
const authInfo = isAdmin ? [] : plv8.execute(api.authQuery);

if (!schema)
{
    schema = '';
}
else if (schema.length > 0)
{
    schema += '.';
}

const idField = 'id';
const idPostfix = '_id';
const aggPostfix = '_agg';

const aggFunctions = ['max', 'min', 'avg', 'sum'];
const aggFuncPrefix = (aggPostfix[0] === '_') ? '_' : '';
const aggDict = {};
aggFunctions.map(x => aggDict[x + aggFuncPrefix] = `${x.toUpperCase()}($)`);
aggDict['distinct' + aggFuncPrefix] = `array_agg(DISTINCT($))`;
const stringValueKind = 'StringValue';

const aliases = plv8.execute('SELECT * FROM graphql.aliases;');

const fkData = {};

function getAuthInfo(tableName, level)
{
    return api.getAuthInfo(tableName, level, authInfo, user, idField);
}

function getUserWhere(userFilterField, level)
{
    return `a${level}."${userFilterField}"=${userId}`;
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

function getOperatorPart(filterField, fieldName, children)
{
    const operatorName = filterField.name.value;
    const kind = filterField.value.kind;
    const operator = api.operators[operatorName];
    let value = filterField.value.value;

    if (operatorName === 'children')
    {
        const filterParts = [];

        filterField.value.fields.map(f =>
        {
            const newChildren = children ? [...children] : [];
            newChildren.push(f.name.value);

            f.value.fields.map(filterField =>
            {
                filterParts.push(getOperatorPart(filterField, fieldName, newChildren));
            });
        })
        
        return filterParts.join(' AND ');
    }
    else if (api.isArrayOperator(operator))
    {
        return `${value}${operator}(${fieldName})`;
    }
    else
    {
        const values = filterField.value.values
            ? filterField.value.values.map(x => ({
                isString: x.kind === stringValueKind,
                value: x.value
            }))
            : [];

        value = api.getOperatorValue(operatorName, value, values, kind === stringValueKind);
    } 

    if (children && children.length)
    {
        const childrenItems = children.map(x => `'${x}'`);
        const childOperator = '->';
        const lastChildOperator = (operator === api.operators.jsquery) ? childOperator : '->>';

        for (let i = 0; i < children.length - 1; i++)
        {
            fieldName = `${fieldName}${childOperator}${childrenItems[i]}`;
        }

        fieldName = `${fieldName}${lastChildOperator}${childrenItems[children.length - 1]}`;
    }

    return `${fieldName}${operator}${value}`;
}

function getFilter(args, level, fkRows, fkReverseRows)
{
    const filterName = 'filter';
    const orName = 'or';

    fkReverseRows = fkReverseRows ?? [];
    const relatedNames = fkRows
       .filter(x => canBeRelated(x.column_name))
       .map(x => getRelatedName(x.column_name))
       .concat(fkReverseRows.map(y => y.table_name));

    let qraphqlFilter = '';

    args = args.filter(x => x.name.value === filterName);

    if (args.length)
    {
        const [filter] = args;
        let filterParts = [];

        filter.value.fields
            .filter(x => x && !relatedNames.includes(x.name.value) && x.name.value !== orName)
            .map(filterVal =>
            {
                if (filterVal.value.kind === 'NullValue')
                {
                    filterParts.push(`a${level}."${filterVal.name.value}" IS NULL`);
                }
                else if (filterVal.value.kind !== 'ObjectValue')
                {
                    filterParts.push((filterVal.value.kind === stringValueKind)
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

        const orFilterItems = filter.value.fields.filter(x => x?.name?.value === orName);
        if (orFilterItems.length)
        {
            const [orFilter] = orFilterItems;

            const graphqlOrFilters = orFilter.value.values.map(x =>
            {
                const orArgs = {
                    name: { value: filterName },
                    value: x
                };

                return getFilter([orArgs], level, fkRows, fkReverseRows);
            });

            const graphqlOrFilter = `(${graphqlOrFilters.join(' OR ')})`;
            filterParts.push(graphqlOrFilter);
        }

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
            .filter(x => x)
            .map(filterVal =>
            {
                const aggField = getAggFieldSql(filterVal.name.value);
                const fieldName = aggField.func
                    .replace('$', `a${level}."${filterVal.name.value.substr(aggField.key.length)}"`)

                filterVal.value.fields.map(filterField =>
                {
                    filterParts.push(getOperatorPart(filterField, fieldName));
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
            .filter(x => x && relatedNames.includes(x.name.value))
            .map(x => ret[x.name.value] = x.value.value);
    }

    return ret;
}

function getRelationReverseFilter(args, fkRows, level)
{
    const relatedNames = fkRows
       .map(x => x.table_name);

    const ret = {};

    args = args.filter(x => x.name.value === 'filter');

    if (args.length)
    {
        const [filter] = args;

        filter.value.fields
            .filter(x => x && relatedNames.includes(x.name.value))
            .map(x => ret[x.name.value] = x.value.value);
    }

    return ret;
}

function processInheritFilters(selection, fkRows, otherFilter, level, tableName)
{
    const table = selection.selectionSet;

    const ret = {
        relationFilter: getRelationFilter(selection.arguments, fkRows),
        relatableFkRows: fkRows.filter(x => canBeRelated(x.column_name))
    };

    ret.relationFilterKeys = Object.keys(ret.relationFilter);
    ret.relFilter = '';

    const whereArr = [];
   
    ret.relationFilterKeys
        .filter(x => ret.relationFilter[x])
        .map(x =>
        {
            let foundFkRows = ret.relatableFkRows
                .filter(fkRow => getRelatedName(fkRow.column_name).toLowerCase() === x.toLowerCase());

            if (foundFkRows.length > 1)
            {
                foundFkRows = foundFkRows
                    .filter(fkRow => fkRow.table_name.toLowerCase() === tableName.toLowerCase()
                        || (fkRow.table_name + aggPostfix).toLowerCase() === tableName.toLowerCase())
            }

            const [fkRow] = foundFkRows;

            ret.relFilter += ` JOIN ${schema}"${fkRow.foreign_table_name}" a${level + 1} ON a${level}."${fkRow.column_name}"=a${level + 1}."${fkRow.foreign_column_name}"`;

            const [selectionField] = table.selections
                .filter(field => field.name.value.toLowerCase() === x.toLowerCase());
            
            const relGraphqlFilter = getFilter(selectionField.arguments, level + 1, fkRows);

            const authInfo = getAuthInfo(fkRow.foreign_table_name, level + 1);

            const userWhere = !authInfo.readAllowed
                ? ' 0'
                : (authInfo.userFilter ? getUserWhere(authInfo.userFilterField, level + 1) : '');

            if (relGraphqlFilter.length)
            {
                whereArr.push(relGraphqlFilter);
            }
            if (userWhere.length)
            {
                whereArr.push(userWhere);
            }
        });

    ret.relWhere = mixWhere(whereArr, false);

    return ret;
}

function processInheritReverseFilters(selection, fkRows, level)
{
    const table = selection.selectionSet;

    const ret = {
        relationFilter: getRelationReverseFilter(selection.arguments, fkRows, level)
    };

    ret.relationFilterKeys = Object.keys(ret.relationFilter);
    ret.relFilter = '';
   
    ret.relationFilterKeys
        .filter(x => ret.relationFilter[x])
        .map(x =>
        {
            const [fkRow] = fkRows
                .filter(fkRow => fkRow.table_name.toLowerCase() === x.toLowerCase());

            const [selectionField] = table.selections
                .filter(field => field.name.value.toLowerCase() === x.toLowerCase());

            const authInfo = getAuthInfo(fkRow.table_name, level + 1);

            const userWhere = !authInfo.readAllowed
                ? ' 0'
                : (authInfo.userFilter ? getUserWhere(authInfo.userFilterField, level + 1) : '');
            
            const relGraphqlFilter = getFilter(selectionField.arguments, level + 1, fkRows);

            const relWhere = mixWhere([userWhere, relGraphqlFilter], true);

            ret.relFilter += ` JOIN (SELECT "${fkRow.column_name}" FROM ${schema}"${fkRow.table_name}" a${level + 1}${relWhere}
                GROUP BY "${fkRow.column_name}") a${level + 1} 
                ON a${level}."${fkRow.foreign_column_name}"=a${level + 1}."${fkRow.column_name}"`;
        });

    return ret;
}

function createOrderBy(order, isDesc, rows, level)
{
    const additionalOrder = order.value.value !== idField
        && rows.map(x => x.column_name).includes(idField)
            ? `, a${level}."${idField}"` : "";

    const dotIndex = order.value.value.indexOf(".");
    const mainOrder = (dotIndex > 0)
        ? order.value.value.substr(dotIndex + 1)
        : order.value.value;

    const orderLevel = (dotIndex > 0) ? (level + 1) : level;

    return ` ORDER BY a${orderLevel}."${mainOrder}"${isDesc ? " DESC" : ""}${additionalOrder}`;
}

function mixWhere(whereArr, addWhereOperator)
{
    whereArr = whereArr.filter(x => x?.length);

    if (!whereArr.length)
    {
        return "";
    }

    if (addWhereOperator && whereArr[0].includes('WHERE'))
    {
        whereArr[0] = whereArr[0].replace('WHERE', '');
    }

    return `${addWhereOperator ? ' WHERE ' : ''}${whereArr.join(' AND ')}`;
}

function viewTable(selection, tableName, result, where, join, level)
{
    // Authorize
    const { readAllowed, userFilter, userFilterField } = getAuthInfo(tableName, level);

    if (!readAllowed)
    {
        result[tableName] = [];
        return;
    }

    const table = selection.selectionSet;
    const tableKeys = table.selections.map(x => x.name.value);

    const fkRowsAll = getFkData(tableName);
    const fkRows = fkRowsAll.filter(x => canBeRelated(x.column_name))
        .filter(item => item.table_name === tableName
            && tableKeys.includes(getRelatedName(item.column_name)));

    let aggExist = false;
    const fkReverseRows = fkRowsAll.filter(item =>
        {
            const isAggField = tableKeys.includes(item.table_name + aggPostfix);
            aggExist = aggExist || isAggField;
        
            return item.foreign_table_name === tableName
                && (tableKeys.includes(item.table_name) || isAggField);
        });

    const fkFields = fkRows.map(a => a.column_name);
    const allFields = fkFields.concat(tableKeys);
    const allFieldsFiltered = allFields.filter((item, pos) => allFields.indexOf(item) === pos);

    if (userFilter)
    {
        allFieldsFiltered.push(userFilterField);
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
    if (selection.arguments)
    {
        qraphqlFilter = getFilter(selection.arguments, level, fkRows, fkReverseRows);
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
            orderBy = createOrderBy(order, false, rows, level);
        }
        else if (orderDescArgs.length > 0)
        {
            const orderDesc = orderDescArgs[0];
            orderBy = createOrderBy(orderDesc, true, rows, level);
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
                return alias
                    ? `a${level}."${alias.column_name}" AS "${alias.alias}"`
                    : `a${level}."${a.column_name}"`;
            })
            : rows.map(a => `a${level}."${a.column_name}"`);        

        if (fields.length < 1 || aggExist)
        {
            fields.push(`"${idField}"`);
        }

        // Relation objects filter by existing
        let query = `SELECT ${fields.join(", ")} FROM ${schema}"${tableName}" a${level}`;
        const inheritFilters = processInheritFilters(selection, fkRows, qraphqlFilter, level, tableName);
        const inheritReverseFilters = processInheritReverseFilters(selection, fkReverseRows, level);

        const userWhere = (userFilter && rows.filter(x => x.column_name === userFilterField).length)
            ? getUserWhere(userFilterField, level)
            : '';

        const finalWhere = mixWhere([where, qraphqlFilter, inheritFilters.relWhere, userWhere], true);

        query += `${inheritFilters.relFilter} ${inheritReverseFilters.relFilter}${join ?? ''}${finalWhere}${orderBy}${limit}`;

        plv8.elog(NOTICE, query);
        items = plv8.execute(query);

        inheritFilters.relatableFkRows.map(fkRow =>
        {
            table.selections.map(field =>
            {
                const fieldNameLower = field.name.value.toLowerCase();

                if (fieldNameLower === getRelatedName(fkRow.column_name).toLowerCase())
                {
                    let ids = items.map(a => a[fkRow.column_name]).filter(item => item).filter(distinct);
                    if (ids.length > 0)
                    {
                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        const subResult = {};
                        const subResultOrdered = {};

                        const useJoin = level === 2 && ids.length > 6500;
                        const innerWhere = useJoin
                            ? where
                            : ` a${level + 1}."${fkRow.foreign_column_name}" IN(${ids.join(', ')})`;

                        const innerJoin = useJoin
                            ? ` JOIN ${schema}"${tableName}" a${level} ON a${level}."${fkRow.column_name}"=a${level + 1}."${fkRow.foreign_column_name}"`
                            : null;

                        viewTable(field, fkRow.foreign_table_name, subResult, innerWhere, innerJoin, level + 1);

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
                    const reverse_column_name = alias?.column_name ?? fkReverseRow.column_name;

                    const innerJoin = ` JOIN ${schema}"${tableName}" a${level} ON a${level}."${fkReverseRow.foreign_column_name}"=a${level + 1}."${reverse_column_name}"`;
                    let additionalWhere = null;

                    if (limit.length > 0)
                    {
                        let ids = items.map(a => a[idField]);

                        if (typeof ids[0] === 'string')
                        {
                            ids = ids.map(x => `'${x}'`);
                        }

                        additionalWhere = ` a${level}."${idField}" IN(${ids.join(', ')})`;
                    }

                    const finalWhere = mixWhere([where, qraphqlFilter0, additionalWhere], true);

                    if (field.selectionSet?.selections
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

                    viewTable(field, fkReverseRow.table_name, subResult, finalWhere, innerJoin, level + 1);

                    const subItems = subResult[fkReverseRow.table_name];

                    if (subItems)
                    {
                        if (subItems.length)
                        {
                            subItems.map(a =>
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
                        if (aggResultOrdered[item[idField]])
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

function executeAgg(selection, tableName, _result, where, level, aggColumn)
{
    const realTableName = tableName.substr(0, tableName.length - aggPostfix.length);
    const useGroupBy = aggColumn.length > 0;

    // Authorize
    const { readAllowed, userFilter, userFilterField } = getAuthInfo(realTableName, level);

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

    const qraphqlFilter = selection.arguments
        ? getFilter(selection.arguments, level, fkRowsAll, fkRowsAll)
        : '';

    const qraphqlAggFilter = selection.arguments
        ? getAggFilter(selection.arguments, level)
        : '';

    const havingOperator = qraphqlAggFilter.length ? ' HAVING' : '';

    const inheritFilters = processInheritFilters(selection, fkRowsAll, qraphqlFilter, level, tableName);
    const inheritReverseFilters = processInheritReverseFilters(selection, fkRowsAll, level);

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

        userWhere = `${userWhere} a${level}."${userFilterField}"=${userId}`;            
    }

    const aggQuery = `SELECT ${aggSelect}${fieldsSelect} FROM ${schema}"${realTableName}" a${level} ${inheritFilters.relFilter} ${inheritReverseFilters.relFilter}
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
        viewTable(x, x.name.value, result, '', null, 1);
    }
});

exports.ret = { data: result };
