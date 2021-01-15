const args = process.argv.slice(2);
const funcName = args[0];

const top = require("../helpers/top.js");
top.data.funcArgs[funcName] = `../test/${funcName}/pgDev.data.js`;

const func = require(`../functions/${funcName}.js`);

console.log(func.ret);
