exports.entities = [{
    id: 1,
    name: 'Vegetables'
},
{
    id: 3,
    name: 'Vegetables'
}
];

exports.tableName = "company";
exports.operation = "update";
exports.idKeys = ['id'];

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { in: [2, 3] }
    }
};
