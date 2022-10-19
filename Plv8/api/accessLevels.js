const ANON_READ = 0b0000001;
const USER_READ = 0b0000010;
const USER_READ_OWN = 0b0000100;
const USER_WRITE = 0b0010000;
const USER_WRITE_OWN = 0b0100000;
const userField = 'account_id';

const accessLevels = {
    ANON_READ,
    USER_READ,
    ANY_READ: ANON_READ | USER_READ,
    USER_READ_OWN,
    RELATED_READ: 0b0001000,
    USER_WRITE,
    USER_ALL: USER_READ | USER_WRITE,
    USER_WRITE_OWN,
    USER_ALL_OWN: USER_READ_OWN | USER_WRITE_OWN,
    USER_TABLE: 0b1000000,
    DEFAULT_KEY: '$default'
};

const operators =
{
    equals: '=',
    notEquals: '!=',
    less: '<',
    greater: '>',
    lessOrEquals: '<=',
    greaterOrEquals: '>=',
    contains: ' ILIKE ',
    notContains: ' NOT ILIKE ',
    starts: ' ILIKE ',
    ends: ' ILIKE ',
    equalsNoCase: ' ILIKE ',
    arrayContains: ' = ANY',
    arrayNotContains: ' != ALL',
    in: ' IN ',
    notIn: ' NOT IN ',
    isNull: ' IS ',
    jsquery: '@@'
};

exports.accessLevels = accessLevels;
exports.userField = userField;
exports.operators = operators;

function getTableLevels (tableName, authInfo)
{
    let tableLevels = authInfo.filter(x => x.table_name === tableName);

    if (!tableLevels.length)
    {
        tableLevels = authInfo.filter(x => x.table_name === accessLevels.DEFAULT_KEY);
    }

    return tableLevels;
}

exports.getAuthInfo = function(tableName, level, authInfo, user, idField)
{
    const isAdmin = !user || !user.isAnonymous && !user.userId;
    const isAnonymous = !isAdmin && user.isAnonymous;
    const userId = !isAdmin ? user.userId : null;
    const isUser = userId > 0;

    let readAllowed = isAdmin;
    let userFilter = false;
    let userFilterField = userField;

    if (!isAdmin)
    {
        let tableLevels = getTableLevels(tableName, authInfo);

        if (!tableLevels.length)
        {
            readAllowed = true;
        }
        else
        {
            const [tableLevel] = tableLevels;
            const requiredLevel = isAnonymous ? accessLevels.ANON_READ : accessLevels.USER_READ;
            readAllowed = tableLevel.access_level & requiredLevel;

            if (!readAllowed && isUser && (tableLevel.access_level & accessLevels.USER_READ_OWN))
            {
                readAllowed = true;
                userFilter = true;
            }

            if (!readAllowed && (tableLevel.access_level & accessLevels.RELATED_READ))
            {
                readAllowed = level > 1;
            }

            if (!readAllowed && isUser && (tableLevel.access_level & accessLevels.USER_TABLE))
            {
                readAllowed = true;
                userFilter = true;
                userFilterField = idField;
            }
        }
    }

    return { readAllowed, userFilter, userFilterField };
}

exports.getWriteAuthInfo = function(tableName, authInfo, user)
{
    const isAdmin = !user || !user.isAnonymous && !user.userId;
    const userId = !isAdmin ? user.userId : null;
    const isUser = userId > 0;

    let writeAllowed = isAdmin;
    let userFilter = false;

    if (!isAdmin)
    {
        let tableLevels = getTableLevels(tableName, authInfo);

        if (!tableLevels.length)
        {
            writeAllowed = true;
        }
        else if (isUser)
        {
            const [tableLevel] = tableLevels;
            writeAllowed = tableLevel.access_level & USER_WRITE;

            if (!writeAllowed && (tableLevel.access_level & accessLevels.USER_WRITE_OWN))
            {
                writeAllowed = true;
                userFilter = true;
            }
        }
    }

    return { writeAllowed, userFilter };
}

exports.authQuery = 'SELECT * FROM graphql.authorize;';

exports.getOperatorValue = function(operatorName, value, values, isString)
{
    const operator = operators[operatorName];

    if (operatorName === 'starts')
    {
        return `'${value}%'`;
    }
    else if (operatorName === 'ends')
    {
        return `'%${value}'`;
    }
    else if (operatorName === 'equalsNoCase')
    {
        return `'${value}'`;
    }
    else if (operator === operators.contains || operator === operators.notContains)
    {
        return `'%${value}%'`;
    }
    else if (operator === operators.isNull)
    {
        return `${value ? '' : 'NOT '}NULL`;
    }
    else if (operator === operators.in || operator === operators.notIn)
    {
        return `(${values
            .map(x => x.isString ? `'${x.value}'` : x.value)
            .join(', ')})`;
    }
    else if (operator === operators.jsquery)
    {
        return `'${value}'::jsquery`;
    }
    else if (isString)
    {
        return `'${value}'`;
    }

    return value;
}

exports.isArrayOperator = function(operator)
{
    return operator === operators.arrayContains
        || operator === operators.arrayNotContains;
}
