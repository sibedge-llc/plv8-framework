const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');
const top = require(appRoot + "/helpers/top.js");

test('Pascal-case table, insert data test', () =>
{
    const dbPath = appRoot + testHelper.getSqliteFileName(__filename);
    top.dbPath = dbPath;

    sqlite.connect(dbPath);

    const tableName = "Units";

    const dropSql = `DROP TABLE IF EXISTS ${tableName}`;

    const createSql = `
    CREATE TABLE IF NOT EXISTS ${tableName}
    (
      Id integer PRIMARY KEY NOT NULL,
      Name text,
      IsActual boolean,
      Description text,
      Value real
    );`;

    sqlite.run(dropSql);
    sqlite.run(createSql);
    sqlite.close();

    testHelper.runSqlite('sqlChange', __filename);

    sqlite.connect(dbPath);

    let items = sqlite.run(`SELECT * FROM ${tableName}`);
    expect(items.length).toBe(2);

    sqlite.run(dropSql);
    sqlite.close();
});
