const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");
const auth = require(appRoot + "/api/accessLevels.js");

test('Graphql query with reverse inherit filter test', () =>
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
    const items = result.data.company_type;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(2);

    const companies = items[0].company;
    expect(companies.length).toBe(1);
    expect(companies[0].id).toBe(3);

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
