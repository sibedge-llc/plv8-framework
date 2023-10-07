const appRoot = require('app-root-path');
const sqlite = require(appRoot + '/helpers/sqlite.js');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");

test('Graphql query with inherit sorting test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    const setup = require(__dirname + '/authCommonSetup.js');

    sqlite.connect(dbPath);
    sqlite.run(setup.createSql());
    sqlite.close();    

    const result = testHelper.runSqlite('graphqlExecute', __filename);    
    const items = result.data.section;
    expect(items.length).toBe(4);

    expect(items[0].company.name).toBe("Appliances");
    expect(items[1].company.name).toBe("Appliances");
    expect(items[2].company.name).toBe("Fruits");
    expect(items[3].company.name).toBe("Sales");

    sqlite.connect(dbPath);
    sqlite.run(setup.dropSql());
    sqlite.close();
});
