const appRoot = require('app-root-path');

const connStr = require(appRoot + "/config/postgres.js").connStr;

exports.elog = function (type, message)
{
    console.log(message);
}

const quote = require(appRoot + "/helpers/plv8Quote.js")

exports.quote_ident = quote.quote_ident;
exports.quote_literal = quote.quote_literal;
exports.quote_nullable = quote.quote_nullable;

exports.execute = function (query)
{
    const Client = require('pg-native');
    let client = new Client();

    client.connectSync(connStr);
    let ret = client.querySync(query);
    client.end();

    return ret;
}
