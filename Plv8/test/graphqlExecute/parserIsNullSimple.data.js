exports.query = ` query {
    users (filter: {name: null}) {
        id
      }
  }
`;

exports.schema = 's1';
