const utils = require("./helpers/utils.js");
const fs = require('fs');
const commandLineArgs = require('command-line-args');

function createFolder(dir)
{
    if (!fs.existsSync(dir))
    {
        fs.mkdirSync(dir);
    }
}

const optionDefinitions = [
    { name: 'args', alias: 'a', type: String, multiple: true },
    { name: 'api', alias: 'A', type: String },
    { name: 'dbname', alias: 'd', type: String },
    { name: 'name', alias: 'n', type: String, defaultOption: true }
];

const options = commandLineArgs(optionDefinitions);

if (!options.name)
{
    throw Error('name is required');
}

const dbName = options.dbname ?? options.name;

let content = `const configuration = {
    declare: {
        name: '${dbName}'`;

if (options.args?.length)
{
    const argsArr = options.args.map(x => `            ${x}: 'text'`);
    const argsStr = argsArr.join(',\n');
    content += `,
        args: {
${argsStr}
        }`;
}

content += `
    }`;


if (options.api)
{
    content += `,
    apiFunctions: ['${options.api}']`;
}

content += `
};

${utils.localMark}
const NOTICE = 'NOTICE';

const top = require("../helpers/top.js");
const plv8 = require(top.data.plv8);
const args = require(top.data.funcArgs.graphqlExecute);

`;

if (options.args?.length)
{
    const argsStr = options.args.join(', ');
    content += `const { ${argsStr} } = args;

`;
}

if (options.api)
{
    content += `const api = top.createApi(configuration);

`;
}

content += `${utils.beginMark}

exports.ret = null;
`;

const filePath = `${utils.functionsFolder}${options.name}.js`;

fs.writeFile(filePath, content, (err, _data) => console.log(err ?? `${filePath} successfully created`));

const testFolderPath = `${utils.testFolder}${options.name}/`;
createFolder(testFolderPath);

const testFilePath = `${testFolderPath}pgDev.data.js`;
const testLines = options.args.map(x => `exports.${x} = null;`);
const testContent = testLines.join('\n') + '\n';

fs.writeFile(testFilePath, testContent, (err, _data) => console.log(err ?? `${testFilePath} successfully created`));
