const funcName = "graphqlExecute";

const top = require("../helpers/top.js");
top.data.plv8 = `../helpers/plv8Mock.js`;
top.data.funcArgs[funcName] = `../test/${funcName}/parserAgg.data.js`;

const func = require(`../functions/${funcName}.js`);

console.log(func.ret);
