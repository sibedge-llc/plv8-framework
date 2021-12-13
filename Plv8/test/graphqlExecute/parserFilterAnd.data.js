exports.query = ` query {
    users (filter: {weight: {greaterOrEquals: 5}, name: {starts: "A"}}) {
        id
      }
  }
`;

exports.schema = 's1';
