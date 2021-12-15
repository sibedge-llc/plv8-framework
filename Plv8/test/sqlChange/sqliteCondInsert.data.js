exports.entities = [{
    id: 5,
    name: 'Animals',
    account_id: 1,
    company_type_id: 2
},
{
    id: 6,
    name: 'Exchange',
    account_id: 1,
    company_type_id: 1
}
];

exports.tableName = "company";

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { equals: 2 }
    }
};
