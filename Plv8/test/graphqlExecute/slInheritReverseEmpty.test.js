const appRoot = require('app-root-path');
const sqlite = require(appRoot + '/helpers/sqlite.js');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");

test('Reverse inherit items: if no data, it should be empy array (not null)', () =>
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

    const [item3] = items.filter(x => x.id == 3);
    expect(item3.branch.length).toBe(1);

    const [item2] = items.filter(x => x.id == 2);
    expect(item2.branch.length).toBe(0);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
