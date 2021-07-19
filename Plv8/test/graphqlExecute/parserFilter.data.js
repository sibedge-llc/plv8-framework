exports.query = ` query {
    users (filter: {weight: {greaterOrEquals: 5, lessOrEquals: 10}}) {
        id
      }
  }
`;

exports.schema = 's1';
