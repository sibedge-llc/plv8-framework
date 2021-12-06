exports.query = `query {
    company_type (filter: { company: true }) {
      id
      name
      company {
        id
        name
      }
    }
  }
`;

exports.user = {
  isAnonymous: true
};
