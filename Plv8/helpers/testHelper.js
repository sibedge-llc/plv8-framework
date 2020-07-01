var fs = require('fs');
var appRoot = require('app-root-path');

exports.runSqlite = function (func, fileName)
{
    /*
    fs.readFile(`${appRoot}/functions/${func}.js`, 'utf8', function(err, data)
    {
        let dataPathItems = fileName.split(/[\\/]/);
        let dataPath = '';
        
        for (let item = dataPathItems.pop(); item !== 'test'; item = dataPathItems.pop())        
        {
            dataPath = `/${item}${dataPath}`;
        }

        data = data.replace("../helpers/plv8PgNative.js", appRoot + "/helpers/plv8Sqlite.js");
        data = data.replace(`../helpers/${func}.js`, `${appRoot}/test${dataPath.replace('.test.js', '.data.js')}`);

        console.log(data.substr(0, 400));


    });
    */

   let dataPathItems = fileName.split(/[\\/]/);
   let dataPath = '';
   
   for (let item = dataPathItems.pop(); item !== 'test'; item = dataPathItems.pop())        
   {
       dataPath = `/${item}${dataPath}`;
   }

   const top = require("../helpers/top.js");
   top.data.plv8 = "../helpers/plv8Sqlite.js";
   top.data.sqlChange = `../test${dataPath.replace('.test.js', '.data.js')}`;
   
   const func1 = require (`../functions/${func}.js`);
   return func1.ret;
}
