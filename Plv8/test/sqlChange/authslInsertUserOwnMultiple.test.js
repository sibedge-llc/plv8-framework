const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");
const auth = require(appRoot + "/api/accessLevels.js");

test('Entity insertion denied test', () =>
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

    let items = sqlite.run(`SELECT * FROM ${tableName} WHERE id > 3`);
    expect(items.length).toBe(2);

    const [item1] = items.filter(x => x.id === 5);
    expect(item1.name).toBe('Animals');
    expect(item1.company_type_id).toBe(2);
    expect(item1.account_id).toBe(1);

    const [item2] = items.filter(x => x.id === 6);
    expect(item2.name).toBe('PR');
    expect(item2.company_type_id).toBe(1);
    expect(item2.account_id).toBe(1);
    
    sqlite.run(setup.dropSql());
    sqlite.close();
});
