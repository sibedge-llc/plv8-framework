const db = require ("./helpers/plv8PgNative.js");
const fs = require('fs');

const beginMark = "/*BEGIN*/";
const sqlOpenMark = "/*SQL";
const sqlCloseMark = "SQL*/";
const apiMark = "/*API*/";

const args = process.argv.slice(2);
const funcName = args[0];

const readFromFile = (file) => new Promise((resolve, reject) =>
    fs.readFile(file, 'utf8', (err, data) => {
        resolve(data);
    })
);

String.prototype.replaceAll = function(search, replacement)
{
    const target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function runScript(data, scriptApi)
{
    const header = data.substr(0, data.indexOf(beginMark));

    let scriptHeader = header.substr(header.indexOf(sqlOpenMark) + sqlOpenMark.length);
    scriptHeader = scriptHeader.substr(0, scriptHeader.indexOf(sqlCloseMark)) + "AS $$";

    const scriptBody = data.substr(data.indexOf(beginMark) + beginMark.length)
        .replaceAll("exports.ret =", "return");

    const script = `${scriptHeader}
${scriptApi}${scriptBody}
$$ LANGUAGE plv8;`;

    console.log(script);
    let result = db.execute(script);
    console.log(result);
}

fs.readFile(`./functions/${funcName}.js`, 'utf8', function(err, data)
{
    const apiIndex = data.indexOf(apiMark);

    if (apiIndex >= 0)
    {
        const apiDeclareStatement = "var api = {};\n\n";

        let scriptApiDeclare = data.substr(apiIndex + apiMark.length);
        scriptApiDeclare = scriptApiDeclare.substr(0, scriptApiDeclare.indexOf(sqlOpenMark));

        let apiFunctions = [];
        eval(scriptApiDeclare);
        
        const pathList = apiFunctions.map(item => `./api/${item}.js`);

        Promise.all(pathList.map(fileName => readFromFile(fileName)))
            .then(scripts => runScript(data, 
                apiDeclareStatement + scripts.map(s => s.replaceAll("exports.", "api.")).join("\n\n") + '\n'));        
    }
    else runScript(data, '');
});
