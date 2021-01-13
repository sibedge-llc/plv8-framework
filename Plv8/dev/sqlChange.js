const funcName = "sqlChange";

const top = require("../helpers/top.js");
top.data.plv8 = "../helpers/plv8PgNative.js";

top.data.funcArgs[funcName] = `../test/${funcName}/pgDev.data.js`;

const func = require(`../functions/${funcName}.js`);

console.log(func.ret);
