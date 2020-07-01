var sqlite = require('sqlite-sync');
var fs = require('fs');
var appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

sqlite.connect(appRoot + '/test/test.db');

const createSql = `
CREATE TABLE IF NOT EXISTS Families
(
  Id integer PRIMARY KEY NOT NULL,
  Name text,
  IsFunctionalType boolean,
  Description text,
  Value real
);`;

sqlite.run('DROP TABLE IF EXISTS Families');
sqlite.run(createSql);
sqlite.run(`INSERT INTO "Families" ("Id", "Name", "IsFunctionalType", "Description", "Value") VALUES (10, 'hello', true, null, 0.4)`);
sqlite.close();

testHelper.runSqlite('sqlChange', __filename);

/*
fs.readFile('./functions/sqlChange.js', 'utf8', function(err, data)
{
    data = data.replace("../helpers/plv8PgNative.js", "../helpers/plv8Sqlite.js");
    eval(data);

    console.log('end of sqliteTest');
});
*/
