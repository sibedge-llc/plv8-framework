exports.query = ` query {
    users_agg (groupBy: role) {
      count
    }
  }
`;

exports.schema = 's1';
