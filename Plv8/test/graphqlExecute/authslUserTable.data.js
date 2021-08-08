exports.query = `query {
    account {
      id
      name
    }
    account_agg {
      count
    }    
  }
`;

exports.user = {
    userId: 3
};
