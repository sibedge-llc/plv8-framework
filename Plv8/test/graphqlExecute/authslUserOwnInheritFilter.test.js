const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");
const auth = require(appRoot + "/api/accessLevels.js");

test('Graphql query with inherit filter test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const setup = require(__dirname + '/authCommonSetup.js');
    const authLevels = {
        [auth.accessLevels.DEFAULT_KEY]: auth.accessLevels.USER_READ,
        company: auth.accessLevels.USER_READ_OWN
    };

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.run(setup.setAuthSql(authLevels));
    sqlite.close();    

    const result = testHelper.runSqlite('graphqlExecute', __filename);    
    const items = result.data.section;
    expect(items.length).toBe(2);

    expect(items.map(x => x.id).sort()).toEqual([2, 3]);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
