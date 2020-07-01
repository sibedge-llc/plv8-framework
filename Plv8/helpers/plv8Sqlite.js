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
    var sqlite = require('sqlite-sync');
    var appRoot = require('app-root-path');

    sqlite.connect(appRoot + '/test/test.db');
    console.log(appRoot + '/test/test.db');

    let ret = sqlite.run(query.replace('true', '1').replace('false', '0'));
    console.log(ret);
    sqlite.close();
    return ret;
}
