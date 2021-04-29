exports.query = ` query {
    users_agg {
        count
        max_value
        avg_age
      }
  }
`;

exports.schema = 's1';
