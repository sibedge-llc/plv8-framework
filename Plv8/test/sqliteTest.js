var sqlite = require('sqlite-sync');
var fs = require('fs');
var appRoot = require('app-root-path');

sqlite.connect(appRoot + '/test/test.db');

const createSql = `
CREATE TABLE IF NOT EXISTS Families
(
  Id integer PRIMARY KEY NOT NULL AUTOINCREMENT,
  Name text,
  IsFunctionalType boolean,
  Description text,
  Value real
);`;

sqlite.run(createSql);
sqlite.close();

fs.readFile('./functions/sqlChange.js', 'utf8', function(err, data)
{
    data = data.replace("../helpers/helper.js", "../helpers/sqlite.js");
    eval(data);
});
