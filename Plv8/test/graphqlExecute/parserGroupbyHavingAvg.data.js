exports.query = ` query {
    users_agg (groupBy: role, aggFilter: { avg_rate: { greater: 5 }}) {
      key
    }
  }
`;

exports.schema = 's1';
