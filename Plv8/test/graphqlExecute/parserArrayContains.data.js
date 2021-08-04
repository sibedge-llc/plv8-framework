exports.query = ` query {
    users (filter: {roles: {arrayContains: 10}}) {
        id
      }
  }
`;

exports.schema = 's1';
