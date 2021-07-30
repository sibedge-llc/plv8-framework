exports.query = `query {
    company {
      id
      name
    }
    company_agg {
      count
    }    
  }
`;

exports.user = {
    userId: 1
};
