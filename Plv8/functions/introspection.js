const configuration = {
    declare: {
        name: 'plv8.introspection',
        args: {
            schema: 'text',
            idField: 'text',
            idPostfix: 'text',
            aggPostfix: 'text'
        }
    },
    apiFunctions: ['dataSchema', 'utils']
};

/*LOCAL*/
const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.introspection);
const api = top.createApi(configuration);

const { schema, idField, idPostfix, aggPostfix } = args;

/*BEGIN*/

const kinds = {
    Interface: "INTERFACE",
    InputObject: "INPUT_OBJECT",
    Enum: "ENUM",
    Scalar: "SCALAR",
    Object: "OBJECT",
    List: "LIST",
    NonNull: "NON_NULL",
    Union: "UNION"
};

const dataTypes = {
    Text: "text",
    Integer: "integer",
    Boolean: "boolean"
};

const numericTypes = ["integer", "bigint", "real", "double_precision", "numeric"];
const dateTypes = ["timestamp", "date", "time"];
const dateAggFunctionsCommon = ["max", "min"];
const aggFunctionsCommon = ["avg", "sum"].concat(dateAggFunctionsCommon);

const filterOperatorsInt = ["equals", "notEquals", "less", "greater", "lessOrEquals", "greaterOrEquals"];
const filterOperatorsText = ["contains", "notContains", "arrayContains", "arrayNotContains", "starts", "ends", "equalsNoCase", "jsquery"];
const filterOperatorsBool = ["isNull"];
const filterOperatorsArray = ["in", "notIn"];
const filterOperatorsObject = ["children"];

String.prototype.replaceAll = function(search, replacement)
{
    const target = this;
    return target.split(search).join(replacement);
};

function createNamedItem(name)
{
    return { name: name };
}

function getForeignKeyInfo()
{
    const sql = `SELECT table_name AS "TableName", column_name AS "ColumnName",
                  foreign_table_name AS "ForeignTableName", foreign_column_name AS "ForeignColumnName",
                  is_array AS "IsArray"
                FROM graphql.schema_foreign_keys
                ORDER BY table_name, column_name`;

    return plv8.execute(sql);
}

function toTypeName(dbName)
{
    return dbName
        .replaceAll(' ', '_')
        .replaceAll('-', '_');
}

function createType(kind, name, type = null)
{
    return {
        kind: kind,
        name: name,
        ofType: type
    };
}

function createNonNullType(kind, name)
{
    return createType(kinds.NonNull, null, createType(kind, name, null));
}

function createListType(kind, name)
{
    return createType(kinds.List, null, createNonNullType(kind, name));
}

function createNonNullListType(kind, name)
{
    return createType(kinds.NonNull, null, createListType(kind, name));
}

function createNode(fieldInfoList)
{
    const ret = {
        name: "Node",
        description: "An object with an ID",
        fields: [
            {
                args: [],
                name: "id",
                description: "The id of the object.",
                isDeprecated: false,
                type: createNonNullType(kinds.Scalar, "Id"),                
            },
        ],
        kind: kinds.Interface,
        possibleTypes: []
    };

    fieldInfoList
        .map(x => x.TableName)
        .filter(api.distinct)
        .forEach(tableName => ret.possibleTypes.push(createType(kinds.Object, tableName)));    

    return ret;
}

function createQuery(fieldInfoList)
{
    const ret = {
        name: "Query",
        interfaces: [],
        kind: kinds.Object,
        fields: []
    };

    const tables = api.groupBy(fieldInfoList, "TableName");

    Object.keys(tables).forEach(tableName =>
    {
        ret.fields.push({
            name: tableName,
            type: createNonNullListType(kinds.Object, tableName),
            isDeprecated: false,
            args: [
                {
                    name: "id",
                    type: createType(kinds.Scalar, dataTypes.Integer),
                },
                {
                    name: "filter",
                    type: createType(kinds.InputObject, `${tableName}Filter`),
                },
                {
                    name: "orderBy",
                    type: createType(kinds.Enum, `${tableName}OrderBy`),
                },
                {
                    name: "orderByDescending",
                    type: createType(kinds.Enum, `${tableName}OrderByDescending`),
                },
                {
                    name: "skip",
                    type: createType(kinds.Scalar, dataTypes.Integer),
                },
                {
                    name: "take",
                    type: createType(kinds.Scalar, dataTypes.Integer),
                },
            ]
        });

        const table = tables[tableName];
        if (!table.filter(x => x.IsFunction).length)
        {
        ret.fields.push({
            name: tableName + aggPostfix,
            type: createType(kinds.InputObject, tableName + aggPostfix),
            isDeprecated: false,
            args: [
                    {
                        name: "filter",
                        type: createType(kinds.InputObject, `${tableName}Filter`),
                    },
                    {
                        name: "groupBy",
                        type: createType(kinds.Enum, `${tableName}OrderBy`),
                    },
                    {
                        name: "aggFilter",
                        type: createType(kinds.InputObject, `${tableName}AggFilter`),
                    },
                ],
            });
        }
    });

    return ret;
}

function createTables(fieldInfoList, foreignKeyList)
{
    const ret = [];

    const tables = api.groupBy(fieldInfoList, "TableName");

    Object.keys(tables).forEach(key =>
    {
        const element = {
            name: key,
            description: key,
            interfaces: [ createType(kinds.Interface, "Node") ],
            kind: kinds.Object,
            fields: [],
        };

        const table = tables[key];

        table.forEach(column =>
        {
            const isIdColumn = column.ColumnName.toLowerCase() === idField.toLowerCase();

            const dataTypeName = isIdColumn
                ? "Id"
                : toTypeName(column.DataType);

            const field = {
                args: [],
                name: column.ColumnName,
                type: column.IsNullable
                    ? createType(kinds.Scalar, dataTypeName)
                    : createNonNullType(kinds.Scalar, dataTypeName),
                isDeprecated: false
            };

            element.fields.push(field);
        });

        const singleLinks = foreignKeyList.filter(x => x.TableName === key);
        singleLinks.forEach(singleLink =>
        {
            element.fields.push({
                name: singleLink.ColumnName.endsWith(idPostfix)
                    ? singleLink.ColumnName.substr(0, singleLink.ColumnName.length - idPostfix.length)
                    : singleLink.ColumnName,
                type: createType(kinds.Object, singleLink.ForeignTableName),
                args: [
                    {
                        name: "filter",
                        type: createType(kinds.InputObject, `${singleLink.ForeignTableName}Filter`),
                    },
                ],
                isDeprecated: false
            });
        });

        const multipleLinks = foreignKeyList
            .filter(x => x.ForeignTableName === key)
            .concat(foreignKeyList.filter(x => x.IsArray && x.TableName === table.Key)
                .map(x => ({
                    TableName: x.ForeignTableName,
                    ForeignTableName: x.TableName,
                    ColumnName: x.ForeignColumnName,
                    ForeignColumnName: x.ColumnName,
                    IsArray: x.IsArray,
                })));
        
        multipleLinks.forEach(multipleLink =>
        {
            const [foreignTableName] = Object.keys(tables)
                .filter(x => x === multipleLink.TableName);

            const foreignTable = foreignTableName ? tables[foreignTableName] : null;
            
            if (!(foreignTable?.filter(x => x.IsFunction)?.length))
            {            
                element.fields.push({
                    name: multipleLink.TableName,
                    type: createListType(kinds.Object, multipleLink.TableName),
                    args: [
                        {
                            name: "filter",
                            type: createType(kinds.InputObject, `${multipleLink.TableName}Filter`),
                        },
                        {
                            name: "orderBy",
                            type: createType(kinds.Enum, `${multipleLink.TableName}OrderBy`),
                        },
                        {
                            name: "orderByDescending",
                            type: createType(kinds.Enum, `${multipleLink.TableName}OrderByDescending`),
                        }
                    ],
                    isDeprecated: false
                });            

                // TODO: implement aggregate functions for array fields
                if (!multipleLink.IsArray)
                {
                    element.fields.push({
                        name: multipleLink.TableName + aggPostfix,
                        type: createType(kinds.InputObject, `${multipleLink.TableName}${aggPostfix}Nested`),
                        args: [
                            {
                                name: "filter",
                                type: createType(kinds.InputObject, `${multipleLink.TableName}Filter`),
                            }
                        ],
                        isDeprecated: false
                    });
                }
            }
        });

        ret.push(element);
    });

    return ret;
}

function createAggregates(fieldInfoList, foreignKeyList)
{
    const ret = [];

    let selectExpr = x => x;

    if (aggPostfix[0] === '_')
    {
        selectExpr = x => x + "_";
    }

    const dateAggFunctions = dateAggFunctionsCommon.map(selectExpr);
    const aggFunctions = aggFunctionsCommon.map(selectExpr);

    const distinctStart = "distinct" + ((aggPostfix[0] === '_') ? "_" : "");

    const tables = api.groupBy(fieldInfoList.filter(x => !x.IsFunction), "TableName");

    Object.keys(tables).forEach(key =>
    {
        const table = tables[key];

        const countField = {
            args: [],
            name: "count",
            type: createType(kinds.Scalar, dataTypes.Integer),
            isDeprecated: false
        };

        const elementRoot = {
            name: key + aggPostfix,
            description: "Aggregate function for " + key,
            interfaces: [createType(kinds.Interface, "Node")],
            kind: kinds.Object
        }

        const element = {
            name: elementRoot.name + "Nested",
            description: elementRoot.description,
            interfaces: elementRoot.interfaces,
            kind: elementRoot.kind,
            fields: [countField],
        }

        table.filter(c => c.ColumnName.toLowerCase() !== idField.toLowerCase()).forEach(column =>
        {
            const dataTypeName = toTypeName(column.DataType);

            element.fields.push({
                args: [],
                name: distinctStart + column.ColumnName,
                type: createListType(kinds.Object, dataTypeName),
                isDeprecated: false
            });

            if (!column.ColumnName.endsWith(idPostfix))
            {
                let aggFunctionsList = [];

                if (numericTypes.includes(dataTypeName))
                {
                    aggFunctionsList = aggFunctions;
                }
                else if (dateTypes.filter(x => dataTypeName.startsWith(x)).length)
                {
                    aggFunctionsList = dateAggFunctions;
                }

                aggFunctionsList.forEach(aggFunction =>
                {
                    element.fields.push({
                        args: [],
                        name: aggFunction + column.ColumnName,
                        type: createType(kinds.Scalar, dataTypes.Integer),
                        isDeprecated: false
                    });
                });
            }
        });

        const singleLinks = foreignKeyList.filter(x => x.TableName === key);
        singleLinks.forEach(singleLink =>
        {
            element.fields.push({
                name: singleLink.ColumnName.endsWith(idPostfix)
                    ? singleLink.ColumnName.substr(0, singleLink.ColumnName.length - idPostfix.length)
                    : singleLink.ColumnName,
                type: createType(kinds.Object, singleLink.ForeignTableName),
                args: [
                    {
                        name: "filter",
                        type: createType(kinds.InputObject, `${singleLink.ForeignTableName}Filter`),
                    },
                ],
                isDeprecated: false
            });
        });

        elementRoot.fields = element.fields;
        elementRoot.fields.push({
            args: [],
            name: "key",
            type: createType(kinds.Scalar, "Id"),
            isDeprecated: false
        });

        ret.push(element);
        ret.push(elementRoot);
    });

    return ret;
}

function createFilters(fieldInfoList, foreignKeyList)
{
    const ret = [
        {
            name: "FreeFieldsFilter",
            kind: kinds.InputObject,
            inputFields: [],
        },
        {
            name: "OperatorFilter",
            kind: kinds.InputObject,
            inputFields: filterOperatorsText
                .map(x => ({
                    name: x,
                    description: `'${x}' operator.`,
                    type: createType(kinds.Scalar, dataTypes.Text),
                }))
                .concat(filterOperatorsInt.map(x => ({
                    name: x,
                    description: `'${x}' operator.`,
                    type: createType(kinds.Scalar, dataTypes.Integer),
                })))
                .concat(filterOperatorsBool.map(x => ({
                    name: x,
                    description: `'${x}' operator.`,
                    type: createType(kinds.Scalar, dataTypes.Boolean),
                })))
                .concat(filterOperatorsArray.map(x => ({
                    name: x,
                    description: `'${x}' operator.`,
                    type: createListType(kinds.Scalar, dataTypes.Integer),
                })))
                .concat(filterOperatorsObject.map(x => ({
                    name: x,
                    description: `'${x}' operator.`,
                    type: createType(kinds.InputObject, "FreeFieldsFilter"),
                })))
        }
    ];

    let selectExpr = x => x;

    if (aggPostfix[0] === '_')
    {
        selectExpr = x => x + "_";
    }

    const dateAggFunctions = dateAggFunctionsCommon.map(selectExpr);
    const aggFunctions = aggFunctionsCommon.map(selectExpr);

    const tables = api.groupBy(fieldInfoList, "TableName");

    Object.keys(tables).forEach(key =>
    {
        const table = tables[key];

        const filerInputFields = table.map(x => ({
                name: x.ColumnName,
                description: x.ColumnName,
                type: createType(kinds.Object, "OperatorFilter"),
            }));

        const singleLinks = foreignKeyList.filter(x => x.TableName === key);
        singleLinks.forEach(singleLink =>
        {
            const relationField = {
                name: singleLink.ColumnName.endsWith(idPostfix)
                    ? singleLink.ColumnName.substr(0, singleLink.ColumnName.length - idPostfix.length)
                    : singleLink.ColumnName,
                type: createType(kinds.Scalar, dataTypes.Boolean),
            };

            relationField.description = `${relationField.name} relation existing`;

            filerInputFields.push(relationField);
        });

        const multipleLinks = foreignKeyList.filter(x => x.ForeignTableName === key);
        multipleLinks.forEach(multipleLink =>
        {
            const relationField = {
                name: multipleLink.TableName,
                type: createType(kinds.Scalar, dataTypes.Boolean),
            };

            relationField.description = `${relationField.name} reverse relation existing`;

            filerInputFields.push(relationField);
        });

        const orField = {
            name: "or",
            type: createListType(kinds.InputObject, `${key}Filter`),
        };

        filerInputFields.push(orField);

        ret.push({
            name: `${key}Filter`,
            kind: kinds.InputObject,
            inputFields: filerInputFields,
        });

        ret.push({
            name: `${key}OrderBy`,
            kind: kinds.Enum,
            enumValues: table.map(x => ({ name: x.ColumnName, isDeprecated: false }))
        });

        ret.push({
            name: `${key}OrderByDescending`,
            kind: kinds.Enum,
            enumValues: table.map(x => ({ name: x.ColumnName, isDeprecated: false }))
        });

        if (!table.filter(x => x.IsFunction).length)
        {
            const aggFilerInputFields = [
                {
                    name: "count",
                    description: "count",
                    type: createType(kinds.Object, "OperatorFilter")
                }
            ];

            table
                .filter(x => !x.ColumnName.endsWith(idPostfix) && x.ColumnName !== idField)
                .forEach(column =>
            {
                const dataTypeName = toTypeName(column.DataType);
                let aggFunctionsList = [];

                if (numericTypes.includes(dataTypeName))
                {
                    aggFunctionsList = aggFunctions;
                }
                else if (dateTypes.filter(x => dataTypeName.startsWith(x)).length)
                {
                    aggFunctionsList = dateAggFunctions;
                }

                aggFunctionsList.forEach(aggFunction =>
                {
                    aggFilerInputFields.push({
                        name: aggFunction + column.ColumnName,
                        description: aggFunction + column.ColumnName,
                        type: createType(kinds.Object, "OperatorFilter"),
                    });
                });
            });

            ret.push({
                name: `${key}AggFilter`,
                kind: kinds.InputObject,
                inputFields: aggFilerInputFields,
            });
        }
    });

    return ret;
}

function getTypes()
{
    let ret = [];
    const fieldInfoList = api.getFieldInfo(schema, plv8);
    const foreignKeyInfoList = getForeignKeyInfo();

    ret.push(createNode(fieldInfoList));
    ret.push(createQuery(fieldInfoList));
    ret = ret.concat(createTables(fieldInfoList, foreignKeyInfoList));
    ret = ret.concat(createFilters(fieldInfoList, foreignKeyInfoList));
    ret = ret.concat(createAggregates(fieldInfoList, foreignKeyInfoList));

    // Data types
    ret.push({
        name: "Id",
        description: "The `Id` scalar type represents a unique identifier.",
        kind: kinds.Scalar,
    });
    
    fieldInfoList.map(x => x.DataType)
        .concat([ dataTypes.Integer, dataTypes.Text, dataTypes.Boolean ])
        .filter(api.distinct)
        .forEach(dataType =>
        {
            ret.push({
                name: toTypeName(dataType),
                description: `The '${dataType}' scalar type.`,
                kind: kinds.Scalar
            });
        });
    
    // Mutation, subscription
    ret.push({
        name: "Mutation",
        interfaces: [],
        fields: [],
        kind: kinds.Object
    });
    
    ret.push({
        name: "Subscription",
        interfaces: [],
        fields: [],
        kind: kinds.Object,
    });    

    return ret;
}

const result = {
    directives: [],
    mutationType: createNamedItem("Mutation"),
    subscriptionType: createNamedItem("Subscription"),
    queryType: createNamedItem("Query"),
    types: getTypes(),
};

exports.ret = {
    data: { "__schema": result }
};
