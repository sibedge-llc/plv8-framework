const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");
const auth = require(appRoot + "/api/accessLevels.js");

test('Update multiple entities with condition test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const funcName = 'sqlChange';
    const tableName = 'company';

    const setup = require(__dirname.replace(funcName, 'graphqlExecute') + '/authCommonSetup.js');
    const authLevels = { [auth.accessLevels.DEFAULT_KEY]: auth.accessLevels.USER_ALL };

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.run(setup.setAuthSql(authLevels));
    sqlite.close();

    testHelper.runSqlite(funcName, __filename);

    sqlite.connect(dbPath);

    const items = sqlite.run(`SELECT * FROM ${tableName} WHERE id IN(5, 6, 7)`);
    expect(items.length).toBe(2);
    
    const [item6] = items.filter(x => x.id === 6);
    const [item7] = items.filter(x => x.id === 7);

    expect(item6.name).toBeNull();
    expect(item6.company_type_id).toBe(1);

    expect(item7.name).toBeNull();
    expect(item7.company_type_id).toBe(2);

    sqlite.run(setup.dropSql());
    sqlite.close();
});
