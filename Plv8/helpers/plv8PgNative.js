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
    const Client = require('pg-native');
    let client = new Client();

    client.connectSync('postgresql://fm:1q2w3e$R@192.168.33.140:5432/FmStage');
    let ret = client.querySync(query);
    client.end();

    return ret;
}
