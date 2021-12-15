exports.entities = [{
        id: 1
    },
    {
        id: 2
    }
];

exports.tableName = "company";
exports.operation = "delete";
exports.idKeys = ['id'];

exports.user = {
    userId: 1,
    condition: {
        company_type_id: { equals: 2 }
    }
};
