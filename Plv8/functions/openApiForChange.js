const configuration = {
    declare: {
        name: 'plv8.openapi',
        args: {
            baseUrl: 'text',
            schemaName: 'text',
            filterTables: 'jsonb'
        }
    },
    apiFunctions: ['dataSchema', 'utils']
};

/*LOCAL*/
const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.openApiForChange);

const api = top.createApi(configuration);

const { baseUrl, schemaName, filterTables } = args;

/*BEGIN*/

const insertOperation = "Insert";
const updateOperation = "Update";
const deleteOperation = "Delete"

const changeOperations = {
    Insert: "",
    Update: "update",
    Delete: "delete"
};

const objectType = "object";
const arrayType = "array";

const contentTypes = ["application/json", "text/json"];
const responseContentTypes = ["application/json", "text/json"];

const tableNameField = "TableName";
const okResponse = "200";

function toTypeName(dbName)
{
    return dbName
        .replaceAll(' ', '_')
        .replaceAll('-', '_');
}

function getSchemaKey(schema, operation)
{
    return (operation === insertOperation) ? schema : `${schema}_${changeOperations[operation]}`;
}

function getResponseSchemaKey(schema)
{
    return `${schema}_response`;
}

function generateSchemas(fieldInfoList, operation)
{
    if (operation === insertOperation)
    {
        fieldInfoList = fieldInfoList.filter(x => !(x.IsPrimaryKey && x.HasDefaultValue));
    }
    else if (operation === deleteOperation)
    {
        fieldInfoList = fieldInfoList.filter(x => x.IsPrimaryKey);
    }

    const tables = api.groupBy(fieldInfoList, tableNameField);
    const ret = {};

    Object.keys(tables).forEach(tableName =>
    {
        const table = tables[tableName];
        
        const schema = {
            type: objectType,
            properties: {}
        };        
        
        table.forEach(c =>
        {
            const nullable = (operation === insertOperation) ? c.IsNullable : !c.IsPrimaryKey;
            
            schema.properties[c.ColumnName] = {
                type: toTypeName(c.DataType)
            };

            if (nullable)
            {
                schema.properties[c.ColumnName].nullable = nullable;
            }
        });

        ret[getSchemaKey(tableName, operation)] = schema;
    });

    return ret;
}

function generateResponseSchemas(fieldInfoList)
{
    fieldInfoList = fieldInfoList.filter(x => x.IsPrimaryKey);

    const tables = api.groupBy(fieldInfoList, tableNameField);
    var ret = {};

    Object.keys(tables).forEach(tableName =>
    {
        const schema = {
            type: arrayType,
            items: {
                "$ref": `#/components/schemas/${getSchemaKey(tableName, deleteOperation)}`
            },
        };

        ret[getResponseSchemaKey(tableName)] = schema;
    });

    return ret;
}

function generateAllSchemas(fieldInfoList)
{
    return {
        ...generateSchemas(fieldInfoList, insertOperation),
        ...generateSchemas(fieldInfoList, updateOperation),
        ...generateSchemas(fieldInfoList, deleteOperation),
        ...generateResponseSchemas(fieldInfoList)
    };
}

function getContent(contentTypes, table, operation, fieldInfoList)
{
    if ((!operation || operation === deleteOperation)
        && !fieldInfoList.filter(x => x.IsPrimaryKey && x.TableName === table).length)
    {
        return undefined;        
    }

    const schemaKey = !!operation
        ? getSchemaKey(table, operation)
        : getResponseSchemaKey(table);

    const ret = {};

    contentTypes.forEach(contentType => ret[contentType] = {
        schema: {
            "$ref": `#/components/schemas/${schemaKey}`,
        },
    });

    return ret;
}

function generatePaths(fieldInfoList, baseUrl)
{
    const tables = api.groupBy(fieldInfoList, tableNameField);
    var ret = {};

    Object.keys(tables).forEach(tableName =>
    {
        ret[`${baseUrl}/${tableName}`] = {
            post: {
                tags: [tableName],
                summary: `Create ${tableName}`,
                requestBody: {
                    content: getContent(contentTypes, tableName, insertOperation, fieldInfoList),
                },
                responses: {
                    [okResponse]: {
                        description: "Success",
                        content: getContent(responseContentTypes, tableName, null, fieldInfoList),                            
                    }
                }
            },
            put: {
                tags: [tableName],
                summary: `Update ${tableName}`,
                requestBody: {
                    content: getContent(contentTypes, tableName, updateOperation, fieldInfoList),
                },
                responses: {
                    [okResponse]: {
                        description: "Success"
                    }
                }
            },
            delete: {
                tags: [tableName],
                summary: `Delete ${tableName}`,
                requestBody: {
                    content: getContent(contentTypes, tableName, deleteOperation, fieldInfoList),
                },
                responses: {
                    [okResponse]: {
                        description: "Success"
                    }
                }
            }
        }
    });

    return ret;
}

let fieldInfoList = api.getFieldInfo(schemaName, plv8)
    .filter(x => !x.IsGenerated);

if (filterTables?.length)
{
    fieldInfoList = fieldInfoList
        .filter(x => filterTables.filter(t => x.TableName === t).length);
}

const schemas = generateAllSchemas(fieldInfoList);

var document = {
    openapi: "3.0.1",
    info: {
        version: "1.0.0",
        title: "Change data endpoints",
    },
    paths: generatePaths(fieldInfoList, baseUrl),    
    components: {
        schemas: schemas,
    },
};

exports.ret = document;
