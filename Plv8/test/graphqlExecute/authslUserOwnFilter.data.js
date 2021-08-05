exports.query = `query {
    company (filter: {name: {equals: "Sales"}}) {
      id
      name
    }
    company_agg (filter: {name: {equals: "Sales"}}) {
      count
    }    
  }
`;

exports.user = {
    userId: 1
};
