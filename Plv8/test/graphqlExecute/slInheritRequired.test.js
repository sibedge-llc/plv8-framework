const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");

test('Graphql query with inherit existing check test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const setup = require(__dirname + '/authCommonSetup.js');

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.close();    

    const result = testHelper.runSqlite('graphqlExecute', __filename);    
    const items = result.data.branch;
    expect(items.length).toBe(2);

    expect(items.map(x => x.id).sort()).toEqual([1, 3]);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
