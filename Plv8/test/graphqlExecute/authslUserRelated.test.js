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
    const authLevels = {
        [auth.accessLevels.DEFAULT_KEY]: auth.accessLevels.RELATED_READ,
        company: auth.accessLevels.USER_READ_OWN
    };

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.run(setup.setAuthSql(authLevels));
    sqlite.close();

    const result = testHelper.runSqlite('graphqlExecute', __filename);
    const items = result.data.company;

    const item1 = items.filter(x => x.id === 1)[0];
    const item2 = items.filter(x => x.id === 2)[0];

    expect(item1.section.length).toBe(1);
    expect(item1.section[0].id).toBe(1);

    const item1Agg = item1.section_agg;
    expect(item1Agg.count).toBe(1);

    expect(item2.section.length).toBe(2);
    expect(item2.section.map(x => x.id)).toEqual([2, 3]);

    const item2Agg = item2.section_agg;
    expect(item2Agg.count).toBe(2);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
