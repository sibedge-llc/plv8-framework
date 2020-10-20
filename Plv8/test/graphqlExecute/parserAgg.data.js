exports.query = ` query {
    UsersAgg {
        count
        maxValue
        avgAge
      }
  }
`;

exports.schema = 's1';
