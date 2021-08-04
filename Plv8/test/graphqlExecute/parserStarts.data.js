exports.query = ` query {
    users (filter: {name: {starts: "alex"}}) {
        id
      }
  }
`;

exports.schema = 's1';
