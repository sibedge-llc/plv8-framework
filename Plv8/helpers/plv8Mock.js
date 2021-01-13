const jestMock = require('jest-mock');
const appRoot = require('app-root-path');

exports.elog = function (type, message)
{
    console.log(message);
}

const quote = require(appRoot + "/helpers/plv8Quote.js")

exports.quote_ident = quote.quote_ident;
exports.quote_literal = quote.quote_literal;
exports.quote_nullable = quote.quote_nullable;

exports.execute = jestMock.fn(query => []);
