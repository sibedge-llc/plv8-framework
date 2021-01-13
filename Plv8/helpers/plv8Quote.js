exports.quote_ident = function (str)
{
    return `"${str.replace('"', '""')}"`;
}

exports.quote_literal = function (str)
{
    return `'${str.replace("'", "''")}'`;
}

exports.quote_nullable = function (str)
{
    return `'${str.replace("'", "''")}'`;
}
