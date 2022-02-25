const db = require ("./helpers/plv8PgNative.js");
const utils = require("./helpers/utils.js");
const fs = require('fs');

const args = process.argv.slice(2);
const functionName = args[0];

const readFromFile = (file) => new Promise((resolve, _reject) =>
    fs.readFile(file, 'utf8', (_err, data) => {
        resolve(data);
    })
);

String.prototype.replaceAll = function(search, replacement)
{
    const target = this;
    return target.split(search).join(replacement);
};

function runScript(data, config, scriptApi, funcName)
{
    console.log(`\n----- Deploying function: ${funcName} -----`);

    const { name, args } = config.declare;
    const sqlArgs = args
        ? Object.keys(args).map(x => `"${x}" ${args[x]}`)
        : [];

    let scriptHeader = `DROP FUNCTION IF EXISTS ${name};
CREATE OR REPLACE FUNCTION ${name}(${sqlArgs.join(', ')}) RETURNS jsonb AS $$`;

    const scriptBody = data.substr(data.indexOf(utils.beginMark) + utils.beginMark.length)
        .replaceAll("exports.ret =", "return");

    const script = `${scriptHeader}
${scriptApi}${scriptBody}
$$ LANGUAGE plv8;`;

    console.log(script);
    let result = db.execute(script);
    console.log(result);
}

function deployFunc(funcName)
{
    fs.readFile(`${utils.functionsFolder}${funcName}`, 'utf8', function (err, data)
    {
        var config = utils.getConfiguration(data);

        const { apiFunctions } = config;
        if (apiFunctions?.length)
        {
            const apiDeclareStatement = "const api = {};\n\n";
            const pathList = apiFunctions.map(item => `./api/${item}.js`);

            Promise.all(pathList.map(fileName => readFromFile(fileName)))
                .then(scripts => runScript(data,
                    config,
                    apiDeclareStatement + scripts.map(s => s.replaceAll("exports.", "api.")).join("\n\n") + '\n',
                    funcName));
        }
        else runScript(data, config, '', funcName);
    })
}

if (functionName)
{
    deployFunc(`${functionName}.js`);
}
else
{
    fs.readdirSync(utils.functionsFolder).forEach(file => {
        deployFunc(file);
    });
}
