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
    const items = result.data.company;
    expect(items.length).toBe(3);

    const [item1] = items.filter(x => x.id === 1);
    expect(item1.section_agg.count).toBe(1);

    const [item2] = items.filter(x => x.id === 2);
    expect(item2.section_agg.count).toBe(2);

    const [item3] = items.filter(x => x.id === 3);
    expect(item3.section_agg.count).toBe(1);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
