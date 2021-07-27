exports.query = ` query {
    users_agg (groupBy: role) {
      key
    }
  }
`;

exports.schema = 's1';
