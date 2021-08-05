exports.query = ` query {
    users_agg (groupBy: role, aggFilter: { count: { equals: 2 }}) {
      key
    }
  }
`;

exports.schema = 's1';
