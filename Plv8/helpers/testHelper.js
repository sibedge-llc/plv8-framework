exports.runSqlite = function (func, fileName)
{
   let dataPathItems = fileName.split(/[\\/]/);
   let dataPath = '';
   
   for (let item = dataPathItems.pop(); item !== 'test'; item = dataPathItems.pop())        
   {
       dataPath = `/${item}${dataPath}`;
   }

   const top = require("../helpers/top.js");
   top.data.plv8 = "../helpers/plv8Sqlite.js";
   top.data.funcArgs[func] = `../test${dataPath.replace('.test.js', '.data.js')}`;
   
   const func1 = require (`../functions/${func}.js`);
   return func1.ret;
}
