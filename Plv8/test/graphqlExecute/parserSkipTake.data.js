exports.query = ` query {
    users (filter: {id: 1}, skip: 10, take: 5) {
        id
      }
  }
`;

exports.schema = 's1';
