const sqlite = require('sqlite-sync');
const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Pascal-case table, insert data test', () =>
{
  const args = require("/home/alexey/work/plv8-boilerplate/Plv8/test/sqlChange/sqlitePascalInsert.data.js");
  const entities = args.entities;
  console.log('entities-0:')
  console.log(entities);

  const dbPath = appRoot + '/test/test.db';
  sqlite.connect(dbPath);

  const dropSql = 'DROP TABLE IF EXISTS Families';

  const createSql = `
    CREATE TABLE IF NOT EXISTS Families
    (
      Id integer PRIMARY KEY NOT NULL,
      Name text,
      IsFunctionalType boolean,
      Description text,
      Value real
    );`;

  sqlite.run(dropSql);
  sqlite.run(createSql);
  sqlite.close();

  testHelper.runSqlite('sqlChange', __filename);

  sqlite.connect(dbPath);

  let items = sqlite.run('SELECT * FROM Families');
  expect(items.length).toBe(2);

  sqlite.run(dropSql);
  sqlite.close();
});

/*
fs.readFile('./functions/sqlChange.js', 'utf8', function(err, data)
{
    data = data.replace("../helpers/plv8PgNative.js", "../helpers/plv8Sqlite.js");
    eval(data);
});
*/



