const appRoot = require('app-root-path');
const sqlite = require(appRoot + '/helpers/sqlite.js');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");
const auth = require(appRoot + "/api/accessLevels.js");

test('Update multiple entities with auth check test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const funcName = 'sqlChange';
    const tableName = 'company';

    const setup = require(__dirname.replace(funcName, 'graphqlExecute') + '/authCommonSetup.js');
    const authLevels = {
        [auth.accessLevels.DEFAULT_KEY]: auth.accessLevels.USER_READ,
        company: auth.accessLevels.USER_WRITE_OWN | auth.accessLevels.USER_READ
    };

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.run(setup.setAuthSql(authLevels));
    sqlite.close();

    testHelper.runSqlite(funcName, __filename);

    sqlite.connect(dbPath);

    const items = sqlite.run(`SELECT * FROM ${tableName} WHERE id IN (1, 3)`);

    const [item1] = items.filter(x => x.id === 1);
    expect(item1.name).toBe('Purchase');
    expect(item1.account_id).toBe(1);

    const [item3] = items.filter(x => x.id === 3);
    expect(item3.name).toBe('Fruits');    
    
    sqlite.run(setup.dropSql());
    sqlite.close();
});
