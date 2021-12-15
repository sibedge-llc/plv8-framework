exports.entities = [{
    id: 5,
    name: 'Inserted-5',
    account_id: 1,
    company_type_id: 2
},
{
    id: 6,
    name: 'Inserted-6',
    account_id: 1,
    company_type_id: 1
},
{
    id: 7,
    name: 'Inserted-7',
    account_id: 2,
    company_type_id: 2
}
];

exports.tableName = "company";

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { equals: 2 }
    }
};
