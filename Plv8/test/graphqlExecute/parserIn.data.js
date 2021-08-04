exports.query = ` query {
    users (filter: {type: {in: [1, 3, 4]}}) {
        id
      }
  }
`;

exports.schema = 's1';
