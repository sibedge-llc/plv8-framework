exports.query = ` query {
    users (orderBy: "name") {
      id
    }
  }
`;

exports.schema = 's1';
