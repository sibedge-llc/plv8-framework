exports.query = `query {
    branch (filter: { account: true }) {
      id
      name
      account {
        id
        name
      }
    }
  }
`;

exports.user = {
    userId: 1
};
