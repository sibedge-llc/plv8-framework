exports.query = ` query {
    users_agg {
        distinct_type
      }
  }
`;

exports.schema = 's1';
