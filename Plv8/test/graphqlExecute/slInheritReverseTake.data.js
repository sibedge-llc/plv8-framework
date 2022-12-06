exports.query = `query {
    company (take: 1) {
      id
      name
      section {
        id
        name
      }
    }
  }
`;

exports.user = {
    userId: 1
};
