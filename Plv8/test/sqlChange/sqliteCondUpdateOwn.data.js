exports.entities = [{
    id: 1,
    name: 'Purchase'
},
{
    id: 2,
    name: 'Purchase'
}
];

exports.tableName = "company";
exports.operation = "update";
exports.idKeys = ['id'];

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { equals: 1 }
    }
};
