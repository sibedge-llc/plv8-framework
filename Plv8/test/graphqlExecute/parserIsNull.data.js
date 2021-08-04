exports.query = ` query {
    users (filter: {name: {isNull: true}}) {
        id
      }
  }
`;

exports.schema = 's1';
