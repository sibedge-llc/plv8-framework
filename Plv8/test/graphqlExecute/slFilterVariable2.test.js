const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const sqlite = require(appRoot + "/helpers/sqlite");
const top = require(appRoot + "/helpers/top.js");

test('slFilterVariable', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;
    const funcName = 'graphqlExecute';

    const setup = require(__dirname + '/authCommonSetup.js');

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.close();

    const result = testHelper.runSqlite(funcName, __filename);
    const items = result.data.section;
    expect(items.length).toBe(1);

    const [item] = items;
    expect(item.id).toBe(2);

    const [agg] = result.data.section_agg;
    expect(agg.count).toBe(1);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
