exports.query = ` query ($val: Integer) {
    users (filter: {type: {equals: $val}}) {
        id
      }
  }
`;

exports.schema = 's1';
exports.variables = {
  "val": 0
};
