exports.query = `query {
    company_type_agg (groupBy: name) {
      count
    }
  }
`;

exports.user = {
    isAnonymous: true
};
