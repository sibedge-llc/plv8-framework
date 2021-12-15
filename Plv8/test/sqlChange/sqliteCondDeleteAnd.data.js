exports.entities = [{
    id: 2
},
{
    id: 3
}
];

exports.tableName = "company";
exports.operation = "delete";
exports.idKeys = ['id'];

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { equals: 2 },
        name: { starts: "F" }
    }
};
