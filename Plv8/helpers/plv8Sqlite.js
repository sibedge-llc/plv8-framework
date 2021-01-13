const appRoot = require('app-root-path');

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
    const sqlite = require('sqlite-sync');    
    const top = require(appRoot + "/helpers/top.js");

    sqlite.connect(top.dbPath);

    let ret = sqlite.run(query.replace('true', '1').replace('false', '0'));
    console.log(ret);
    sqlite.close();
    return ret;
}
