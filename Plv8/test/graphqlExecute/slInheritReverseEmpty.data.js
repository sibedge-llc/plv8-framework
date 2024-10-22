exports.query = `query {
    company {
      id
      name
      branch {
        id
        name
      }
    }
  }
`;

exports.user = {
    userId: 1
};
