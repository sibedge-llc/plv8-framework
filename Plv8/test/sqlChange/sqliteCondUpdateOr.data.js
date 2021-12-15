exports.entities = [{
    id: 2,
    name: 'Changed-2'
},
{
    id: 3,
    name: 'Changed-3'
},
{
    id: 4,
    name: 'Changed-4'
}
];

exports.tableName = "section";
exports.operation = "update";
exports.idKeys = ['id'];

exports.user = {
    userId: 1,
    condition: {
        or: [
            {
                company_id: { equals: 3 }
            },
            {
                name: { ends: "1" }
            }
        ]
    }
};
