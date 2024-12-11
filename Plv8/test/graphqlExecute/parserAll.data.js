exports.query = ` query {
    users (filter: {name: {all: true}}) {
        id
      }
  }
`;

exports.schema = 's1';
