function run(func, fileName, plv8Helper)
{
    const top = require("../helpers/top.js");
    top.data.plv8 = `../helpers/${plv8Helper}.js`;
    top.data.funcArgs[func] = `..${getDataFilename(fileName)}`;
    
    const func1 = require (`../functions/${func}.js`);
    return func1.ret;
}

exports.runSqlite = (func, fileName) => run(func, fileName, "plv8Sqlite");

exports.runMock = (func, fileName) => run(func, fileName, "plv8Mock");

exports.astifySql = function(sql)
{
    const { Parser } = require('node-sql-parser/build/postgresql');
    const parser = new Parser();

    const opt = { database: 'PostgresQL' };

    return parser.astify(sql.trim(), opt);
}

function getDataFilename(testFileName, postfix = "data.js")
{
    let dataPathItems = testFileName.split(/[\\/]/);
    let dataPath = '';
    
    for (let item = dataPathItems.pop(); item !== 'test'; item = dataPathItems.pop())        
    {
        dataPath = `/${item}${dataPath}`;
    }

    return `/test${dataPath.replace('.test.js', '.' + postfix)}`;
}

exports.getSqliteFileName = testFileName => "/sqlite/" + getDataFilename(testFileName, "test.db")
    .split(/[\\/]/).reverse()[0];

exports.getDataFilename = getDataFilename;
