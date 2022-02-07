const beginMark = "/*BEGIN*/";
const localMark = "/*LOCAL*/";

const functionsFolder = "./functions/";
const testFolder = "./test/";

exports.beginMark = beginMark;
exports.localMark = localMark;
exports.functionsFolder = functionsFolder;
exports.testFolder = testFolder;

exports.getConfiguration = function(scriptText)
{
    const header = scriptText.substr(0, scriptText.indexOf(beginMark));
    const configStr = header.substr(0, header.indexOf(localMark));
    const expr = 'return ' + configStr.substr(configStr.indexOf('{'));
    return new Function(expr)();
}
