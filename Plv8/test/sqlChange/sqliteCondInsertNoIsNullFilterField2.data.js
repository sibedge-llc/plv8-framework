exports.entities = [{
    id: 5,
    name: 'Animals',
    account_id: 1,
    company_type_id: 2
},
{
    id: 6,
    name: null,
    account_id: 1,
    company_type_id: 1
},
{
    id: 7,
    account_id: 1,
    company_type_id: 2
}
];

exports.tableName = "company";

exports.user = {
    userId: 1,
    condition: {
        name: { isNull: true }
    }
};
