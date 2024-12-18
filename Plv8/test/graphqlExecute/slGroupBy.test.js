const appRoot = require('app-root-path');
const sqlite = require(appRoot + '/helpers/sqlite.js');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");

test('Graphql aggregation query with grioupBy test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const setup = require(__dirname + '/authCommonSetup.js');

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.close();    

    const result = testHelper.runSqlite('graphqlExecute', __filename);    
    const items = result.data.section_agg;
    expect(items.length).toBe(3);

    const [item1] = items.filter(x => x.key === 1);
    expect(item1.count).toBe(1);

    const [item2] = items.filter(x => x.key === 2);
    expect(item2.count).toBe(2);

    const [item3] = items.filter(x => x.key === 3);
    expect(item3.count).toBe(1);   

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
