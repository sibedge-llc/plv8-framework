exports.query = `query {
  company (filter: { account_id: 2 }) {
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
