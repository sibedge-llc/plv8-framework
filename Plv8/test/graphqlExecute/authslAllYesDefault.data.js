exports.query = `query {
    company_type {
      id
      name
    }
    company_type_agg {
      count
    }    
  }
`;

exports.user = {
    isAnonymous: true
};
