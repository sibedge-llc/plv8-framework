const top = require("./helpers/top.js");
top.data.plv8 = "../helpers/plv8Sqlite.js";
top.data.funcArgs.sqlChange = "../test/sqlChange/sqlitePascalInsert.data.js";

const func = require("./functions/sqlChange.js");

console.log(func.ret);
