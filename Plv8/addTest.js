const utils = require("./helpers/utils.js");
const fs = require('fs');
const commandLineArgs = require('command-line-args');

const graphqlFunc = 'graphqlExecute';
const authCommonSetup = 'authCommonSetup';

const optionDefinitions = [
    { name: 'func', alias: 'f', type: String },
    { name: 'sqlite', alias: 's', type: Boolean },
    { name: 'mock', alias: 'm', type: Boolean },
    { name: 'common-setup', alias: 'c', type: Boolean },
    { name: 'auth', alias: 'a', type: Boolean },
    { name: 'table', alias: 't', type: String },
    { name: 'name', alias: 'n', type: String, defaultOption: true }
];

const options = commandLineArgs(optionDefinitions);

if (!options.name)
{
    throw Error('name is required');
}

if (!options.func)
{
    throw Error('func is required');
}

if (options.sqlite && options.mock)
{
    throw Error('"sqlite" and "mock" options can not be used in combination');
}

const commonSetup = options['common-setup'];

if (commonSetup && options.table)
{
    throw Error('"common-setup" and "table" options can not be used in combination');
}

let content = `const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
`;

if (options.sqlite)
{
    content += `const sqlite = require('sqlite-sync');
const top = require(appRoot + "/helpers/top.js");
`;
}

if (options.auth)
{
    content += `const auth = require(appRoot + "/api/accessLevels.js");
`;
}

content += `
test('${options.name}', () =>
{
`;

if (options.mock)
{
    content += `    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);
`;
}
else if (options.sqlite)
{
    content += `    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;
    const funcName = '${options.func}';

`;

    if (commonSetup)
    {
        const setupLine = options.func === graphqlFunc
            ? `__dirname + '/${authCommonSetup}.js'`
            : `__dirname.replace(funcName, '${graphqlFunc}') + '/${authCommonSetup}.js'`;
        content += `    const setup = require(${setupLine});
`;
        if (options.auth)
        {
            content += `    const authLevels = { [auth.accessLevels.DEFAULT_KEY]: auth.accessLevels.ANON_READ };
`;
        }

        content += `
    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
`;
        if (options.auth)
        {
            content += `    sqlite.run(setup.setAuthSql(authLevels));
`;
        }

        content += `    sqlite.close();

`;
    }
    else if (options.table)
    {
        content += `    sqlite.connect(dbPath);

    const tableName = '${options.table}';

    const dropSql = \`DROP TABLE IF EXISTS \${tableName}\`;

    const createSql = \`
    CREATE TABLE IF NOT EXISTS \${tableName}
    (
      id integer PRIMARY KEY NOT NULL
    );\`;
    
    sqlite.run(dropSql);
    sqlite.run(createSql);
    sqlite.close();

`;
    }

    content += `    const result = testHelper.runSqlite(funcName, __filename);
`;
    if (commonSetup || options.table)
    {
        const dropScript = options.table ? 'dropSql' : 'setup.dropSql()';
        content += `
    sqlite.connect(dbPath);
    sqlite.run(${dropScript});
    sqlite.close();
`;
    }
}

content += `});
`;

const path = `${utils.testFolder}${options.func}/${options.name}`;

// Test data
fs.readFile(`${utils.functionsFolder}${options.func}.js`, 'utf8', function (err, data)
{
    if (err)
    {
        throw Error(`Funtion file read error: ${err}`);
    }

    var config = utils.getConfiguration(data);

    let testContent = '\n';
    if (config.declare.args)
    {
        const args = Object.keys(config.declare.args).map(x => `exports.${x} = null;`);
        testContent = args.join('\n') + '\n';
    }
    
    const testFilePath = `${path}.data.js`;
    fs.writeFile(testFilePath, testContent, (err, _data) => console.log(err ?? `${testFilePath} successfully created`));
});

const filePath = `${path}.test.js`;
fs.writeFile(filePath, content, (err, _data) => console.log(err ?? `${filePath} successfully created`));
