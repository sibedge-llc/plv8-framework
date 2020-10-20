function run(func, fileName, plv8Helper)
{
    let dataPathItems = fileName.split(/[\\/]/);
    let dataPath = '';
    
    for (let item = dataPathItems.pop(); item !== 'test'; item = dataPathItems.pop())        
    {
        dataPath = `/${item}${dataPath}`;
    }
 
    const top = require("../helpers/top.js");
    top.data.plv8 = `../helpers/${plv8Helper}.js`;
    top.data.funcArgs[func] = `../test${dataPath.replace('.test.js', '.data.js')}`;
    
    const func1 = require (`../functions/${func}.js`);
    return func1.ret;
}

exports.runSqlite = (func, fileName) => run(func, fileName, "plv8Sqlite");

exports.runMock = (func, fileName) => run(func, fileName, "plv8Mock");

exports.astifySql = function(sql)
{
    const { Parser } = require('node-sql-parser/build/postgresql');
    const parser = new Parser();

    const opt = {
        database: 'PostgresQL'
    }

    return parser.astify(sql.trim(), opt);
}
