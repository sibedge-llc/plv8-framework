const appRoot = require('app-root-path');

exports.elog = function (type, message)
{
    console.log(message);
}

const quote = require(appRoot + "/helpers/plv8Quote.js")

exports.quote_ident = quote.quote_ident;
exports.quote_literal = quote.quote_literal;
exports.quote_nullable = quote.quote_nullable;

String.prototype.replaceAll = function(search, replacement)
{
    const target = this;
    return target.split(search).join(replacement);
};

exports.execute = function (query)
{
    const sqlite = require(appRoot + "/helpers/sqlite");
    const top = require(appRoot + "/helpers/top.js");

    sqlite.connect(top.dbPath);

    const sqliteQuery = query
        .replaceAll('true', '1')
        .replaceAll('false', '0')
        .replaceAll('ILIKE', 'LIKE')
        .replaceAll('graphql.', 'graphql_');

    const ret = sqlite.run(sqliteQuery);

    console.log(ret);
    sqlite.close();
    return ret;
}
