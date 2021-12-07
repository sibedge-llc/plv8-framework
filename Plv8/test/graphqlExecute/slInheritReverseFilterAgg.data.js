exports.query = `query {
    company_agg (filter: { section: true }) {
      count
      section (filter: { name: { ends: "s" } })
    }
  }
`;

exports.user = {
  isAnonymous: true
};
