const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");

test('Graphql query with reverse inherit filter test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const setup = require(__dirname + '/authCommonSetup.js');

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.close();    

    const result = testHelper.runSqlite('graphqlExecute', __filename);    
    const items = result.data.company_agg;
    expect(items.length).toBe(1);

    const [item] = items;
    expect(item.count).toBe(2);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});