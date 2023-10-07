const appRoot = require('app-root-path');
const sqlite = require(appRoot + '/helpers/sqlite.js');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");

test('Single entity update data test', () =>
{
    const dbPath = testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    sqlite.connect(dbPath);

    const tableName = "users";

    const dropSql = `DROP TABLE IF EXISTS ${tableName}`;

    const createSql = `
    CREATE TABLE IF NOT EXISTS ${tableName}
    (
      id integer PRIMARY KEY NOT NULL,
      name text,
      is_admin boolean,
      email text,
      quality_level real
    );`;

    sqlite.run(dropSql);
    sqlite.run(createSql);
    sqlite.close();

    testHelper.runSqlite('sqlChange', __dirname + '/sqliteSingleInsert.test.js');
    testHelper.runSqlite('sqlChange', __filename);
    
    sqlite.connect(dbPath);

    let items = sqlite.run(`SELECT * FROM ${tableName}`);
    expect(items.length).toBe(1);
    
    const item = items[0];
    expect(item.name).toBe('Vladislav');
    expect(item['is_admin']).toBe(0);
    expect(item['quality_level']).toBe(3.3);
    expect(item.email).toBe('vladik@mail.com');
    expect(item.id).toBe(15);

    sqlite.run(dropSql);
    sqlite.close();
});
