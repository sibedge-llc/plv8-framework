exports.query = ` query {
    users (filter: {name: {ends: "es"}}) {
        id
      }
  }
`;

exports.schema = 's1';
