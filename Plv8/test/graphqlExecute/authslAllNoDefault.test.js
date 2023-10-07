const appRoot = require('app-root-path');
const sqlite = require(appRoot + '/helpers/sqlite.js');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");
const auth = require(appRoot + "/api/accessLevels.js");

test('Single graphql query test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const setup = require(__dirname + '/authCommonSetup.js');
    const authLevels = { [auth.accessLevels.DEFAULT_KEY]: auth.accessLevels.USER_READ };

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.run(setup.setAuthSql(authLevels));
    sqlite.close();

    const result = testHelper.runSqlite('graphqlExecute', __filename);
    const items = result.data.company_type;
    expect(items.length).toBe(0);

    const itemsAgg = result.data.company_type_agg;
    expect(itemsAgg[0].count).toBe(0);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
