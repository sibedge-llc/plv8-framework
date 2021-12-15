exports.entities = {
    id: 3,
    name: 'Purchase'
};

exports.tableName = "company";
exports.operation = "update";
exports.idKeys = ['id'];

exports.user = {
    userId: 1,
    condition: {
        company_types: { arrayContains: 2 }
    }
};
