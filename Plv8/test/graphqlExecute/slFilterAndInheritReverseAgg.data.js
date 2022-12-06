exports.query = `query {
  company (filter: { account_id: 2 }) {
    id
    name
    section_agg {
      count
    }
  }
}
`;

exports.user = {
    userId: 1
};
