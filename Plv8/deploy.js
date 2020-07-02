const db = require ("./helper.js");
const fs = require('fs');

fs.readFile('./createFunction.js', 'utf8', function(err, data)
{
    const beginMark = "/*BEGIN*/";
    const sqlOpenMark = "/*SQL";
    const sqlCloseMark = "SQL*/";

    let header = data.substr(0, data.indexOf(beginMark));

    let scriptHeader = header.substr(header.indexOf(sqlOpenMark) + sqlOpenMark.length);
    scriptHeader = scriptHeader.substr(0, scriptHeader.indexOf(sqlCloseMark)) + "AS $$";

    let scriptBody = data.substr(data.indexOf(beginMark) + beginMark.length)
        .replace("exports.ret =", "return");

    let script = `${scriptHeader}
${scriptBody}
$$ LANGUAGE plv8;`;

    let result = db.execute(script);
    console.log(result);
});
