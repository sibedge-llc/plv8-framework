function getSafeString(obj, sourcePattern, destinationPattern)
{
    const str = (typeof obj === 'string')
        ? obj
        : JSON.stringify(obj);

    return str.replace(sourcePattern, destinationPattern);
}

exports.quote_ident = function (str)
{
    return `"${getSafeString(str, '"', '""')}"`;
}

exports.quote_literal = function (str)
{
    return `'${getSafeString(str, "'", "''")}'`;
}

exports.quote_nullable = function (str)
{
    return `'${getSafeString(str, "'", "''")}'`;
}
