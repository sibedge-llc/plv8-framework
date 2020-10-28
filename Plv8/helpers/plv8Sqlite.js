exports.elog = function (type, message)
{
    console.log(message);
}

exports.quote_ident = function (str)
{
    return str.replace("'", "''");
}

exports.quote_literal = function (str)
{
    return str.replace("'", "''");
}

exports.quote_nullable = function (str)
{
    return str.replace("'", "''");
}

exports.execute = function (query)
{
    const sqlite = require('sqlite-sync');
    const appRoot = require('app-root-path');
    const top = require(appRoot + "/helpers/top.js");

    sqlite.connect(top.dbPath);

    let ret = sqlite.run(query.replace('true', '1').replace('false', '0'));
    console.log(ret);
    sqlite.close();
    return ret;
}
