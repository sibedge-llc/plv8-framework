exports.tables = {
    account: {
        id: 'integer PRIMARY KEY NOT NULL',
        name: 'text'
    },
    company_type: {
        id: 'integer PRIMARY KEY NOT NULL',
        name: 'text'
    },
    company: {
        id: 'integer PRIMARY KEY NOT NULL',
        account_id: 'integer NOT NULL',
        company_type_id: 'integer NOT NULL',
        name: 'text'
    },
    section: {
        id: 'integer PRIMARY KEY NOT NULL',
        company_id: 'integer NOT NULL',
        name: 'text'
    },
    branch: {
        id: 'integer PRIMARY KEY NOT NULL',
        company_id: 'integer NOT NULL',
        account_id: 'integer NOT NULL',
        name: 'text'
    },
    graphql_aliases: { column_name: 'text', alias: 'text'},
    graphql_schema_columns: { column_name: 'text', table_name: 'text'},
    graphql_schema_foreign_keys: {
        column_name: 'text',
        foreign_table_name: 'text',
        foreign_column_name: 'text',
        table_name: 'text'
    },
    graphql_authorize: { table_name: 'text NOT NULL', access_level: 'integer NOT NULL' }
};

exports.setAuthSql = function(accessLevels)
{
    return 'INSERT INTO graphql_authorize (table_name, access_level) VALUES '
        + Object.keys(accessLevels)
            .map(t => `('${t}', ${accessLevels[t]})`)
            .join(', ')
        + ';';
}

exports.fill = `
INSERT INTO account(id, name) VALUES (1, 'Alex'), (2, 'Peter'), (3, 'Kate');
INSERT INTO company_type (id, name) VALUES (1, 'Office'), (2, 'Shop');
INSERT INTO company(id, account_id, company_type_id, name) VALUES
    (1, 1, 1, 'Sales'), (2, 1, 2, 'Appliances'), (3, 2, 2, 'Fruits');
`;

exports.createSql = function()
{
    const sql = Object.keys(exports.tables)
        .map(x => `CREATE TABLE ${x} (${Object.keys(exports.tables[x])
            .map(c => `${c} ${exports.tables[x][c]}`).join(', ')});`)
        .join('\n');

    const userTables = Object.keys(exports.tables)
        .filter(x => !x.startsWith('graphql_'));

    const columnsSql = 'INSERT INTO graphql_schema_columns(column_name, table_name) VALUES '
        + userTables
            .map(t => Object.keys(exports.tables[t])
                .map(c => `('${c}', '${t}')`)
                .join(', '))
            .join(', ')
        + ';\n';

    return exports.dropSql() + '\n' + sql + '\n' + columnsSql + exports.fill;
}

exports.dropSql = function()
{
    return Object.keys(exports.tables)
        .map(x => `DROP TABLE IF EXISTS ${x};`)
        .join('\n');
}
