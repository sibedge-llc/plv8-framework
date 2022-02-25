exports.entities = {
    id: 5,
    name: 'Animals',
    account_id: 1
};

exports.tableName = "company";

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { equals: 2 }
    }
};
