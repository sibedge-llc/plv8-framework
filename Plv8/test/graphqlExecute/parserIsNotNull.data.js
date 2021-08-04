exports.query = ` query {
    users (filter: {name: {isNull: false}}) {
        id
      }
  }
`;

exports.schema = 's1';
