exports.query = ` query {
    users (filter: {type: {notIn: [1, 3, 4]}}) {
        id
      }
  }
`;

exports.schema = 's1';
