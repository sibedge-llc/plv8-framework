exports.entities = {
    id: 2,
    name: 'Vegetables'
};

exports.tableName = "company";
exports.operation = "update";
exports.idKeys = ['id'];

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { equals: 2 },
        name: { starts: "F" }
    }
};
