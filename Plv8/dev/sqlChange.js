const funcName = "sqlChange";

const top = require("../helpers/top.js");
top.data.plv8 = "../helpers/plv8Sqlite.js";

top.data.funcArgs[funcName] = `../test/${funcName}/sqlitePascalInsert.data.js`;

const func = require(`../functions/${funcName}.js`);

console.log(func.ret);
