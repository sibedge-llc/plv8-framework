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

String.prototype.replaceAll = function(search, replacement)
{
    const target = this;
    return target.split(search).join(replacement);
};

function createNamedItem(name)
{
    return { Name: name };
}

function getForeignKeyInfo()
{
    const sql = `SELECT table_name AS "TableName", column_name AS "ColumnName",
                  foreign_table_name AS "ForeignTableName", foreign_column_name AS "ForeignColumnName"
                FROM graphql.schema_foreign_keys`;

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
        Kind: kind,
        Name: name,
        OfType: type
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
        Name: "Node",
        Description: "An object with an ID",
        Fields: [
            {
                Name: "id",
                Description: "The id of the object.",
                Type: createNonNullType(kinds.Scalar, "Id"),
            },
        ],
        Kind: kinds.Interface,
        PossibleTypes: []
    };

    fieldInfoList
        .map(x => x.TableName)
        .filter(api.distinct)
        .forEach(tableName => ret.PossibleTypes.push(createType(kinds.Object, tableName)));    

    return ret;
}

function createQuery(fieldInfoList)
{
    const ret = {
        Name: "Query",
        Interfaces: [],
        Kind: kinds.Object,
        Fields: []
    };

    fieldInfoList
        .map(x => x.TableName)
        .filter(api.distinct)
        .forEach(tableName =>
    {
        ret.Fields.push({
            Name: tableName,
            Type: createNonNullListType(kinds.Object, tableName),
            Args: [
                {
                    Name: "id",
                    Type: createType(kinds.Scalar, dataTypes.Integer),
                },
                {
                    Name: "filter",
                    Type: createType(kinds.InputObject, `${tableName}Filter`),
                },
                {
                    Name: "orderBy",
                    Type: createType(kinds.Enum, `${tableName}OrderBy`),
                },
                {
                    Name: "orderByDescending",
                    Type: createType(kinds.Enum, `${tableName}OrderByDescending`),
                },
                {
                    Name: "skip",
                    Type: createType(kinds.Scalar, dataTypes.Integer),
                },
                {
                    Name: "take",
                    Type: createType(kinds.Scalar, dataTypes.Integer),
                },
            ]
        });

        ret.Fields.push({
            Name: tableName + aggPostfix,
            Type: createType(kinds.InputObject, tableName + aggPostfix),
            Args: [
                {
                    Name: "filter",
                    Type: createType(kinds.InputObject, `${tableName}Filter`),
                },
                {
                    Name: "groupBy",
                    Type: createType(kinds.Enum, `${tableName}OrderBy`),
                },
                {
                    Name: "aggFilter",
                    Type: createType(kinds.InputObject, `${tableName}AggFilter`),
                },
            ],
        });
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
            Name: key,
            Description: key,
            Interfaces: [ createType(kinds.Interface, "Node") ],
            Kind: kinds.Object,
            Fields: [],
        };

        const table = tables[key];

        table.forEach(column =>
        {
            const isIdColumn = column.ColumnName.toLowerCase() === idField.toLowerCase();

            const dataTypeName = isIdColumn
                ? "Id"
                : toTypeName(column.DataType);

            const field = {
                Name: column.ColumnName,
                Type: column.IsNullable
                    ? createType(kinds.Scalar, dataTypeName)
                    : createNonNullType(kinds.Scalar, dataTypeName),
            };

            if (isIdColumn)
            {
                field.RawType = createNonNullType(kinds.Scalar, toTypeName(column.DataType));
            }

            element.Fields.push(field);
        });

        const singleLinks = foreignKeyList.filter(x => x.TableName === key);
        singleLinks.forEach(singleLink =>
        {
            element.Fields.push({
                Name: singleLink.ColumnName.endsWith(idPostfix)
                    ? singleLink.ColumnName.substr(0, singleLink.ColumnName.length - idPostfix.length)
                    : singleLink.ColumnName,
                Type: createType(kinds.Object, singleLink.ForeignTableName),
                Args: [
                    {
                        Name: "filter",
                        Type: createType(kinds.InputObject, `${singleLink.ForeignTableName}Filter`),
                    },
                ]
            });
        });

        const multipleLinks = foreignKeyList.filter(x => x.ForeignTableName === key);
        multipleLinks.forEach(multipleLink =>
        {
            element.Fields.push({
                Name: multipleLink.TableName,
                Type: createListType(kinds.Object, multipleLink.TableName),
                Args: [
                    {
                        Name: "filter",
                        Type: createType(kinds.InputObject, `${multipleLink.TableName}Filter`),
                    },
                    {
                        Name: "orderBy",
                        Type: createType(kinds.Enum, `${multipleLink.TableName}OrderBy`),
                    },
                    {
                        Name: "orderByDescending",
                        Type: createType(kinds.Enum, `${multipleLink.TableName}OrderByDescending`),
                    }
                ]
            });

            element.Fields.push({
                Name: multipleLink.TableName + aggPostfix,
                Type: createType(kinds.InputObject, `${multipleLink.TableName}${aggPostfix}Nested`),
                Args: [
                    {
                        Name: "filter",
                        Type: createType(kinds.InputObject, `${multipleLink.TableName}Filter`),
                    }
                ]
            });
        });

        ret.push(element);
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

    return ret;
}

const result = {
    Directives: [],
    MutationType: createNamedItem("Mutation"),
    SubscriptionType: createNamedItem("Subscription"),
    QueryType: createNamedItem("Query"),
    Types: getTypes(),
};

exports.ret = result;
