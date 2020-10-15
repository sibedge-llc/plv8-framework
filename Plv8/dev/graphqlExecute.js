const funcName = "graphqlExecute";

const top = require("../helpers/top.js");
top.data.funcArgs[funcName] = `../test/${funcName}/pgDev.data.js`;

const func = require(`../functions/${funcName}.js`);

console.log(func.ret);
