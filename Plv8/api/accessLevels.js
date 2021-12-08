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

exports.accessLevels = accessLevels;
exports.userField = userField;

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
