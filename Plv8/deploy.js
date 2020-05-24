var db = require ("./helper.js");
var fs = require('fs');

fs.readFile('./createFunction.js', 'utf8', function(err, data)
{
    var beginMark = "/*BEGIN*/";
    var sqlOpenMark = "/*SQL";
    var sqlCloseMark = "SQL*/";

    var header = data.substr(0, data.indexOf(beginMark));

    var scriptHeader = header.substr(header.indexOf(sqlOpenMark) + sqlOpenMark.length);
    scriptHeader = scriptHeader.substr(0, scriptHeader.indexOf(sqlCloseMark)) + "AS $$";

    var scriptBody = data.substr(data.indexOf(beginMark) + beginMark.length)
        .replace("exports.ret =", "return");

    var script = `${scriptHeader}
${scriptBody}
$$ LANGUAGE plv8;`;

    var result = db.execute(script);
    console.log(result);
});
