exports.query = `query {
    section (filter: { company: true }, orderByDescending: "company.name") {
      id
      name
      company_id
      company {
        id
        name
      }
    }
  }
`;

exports.user = {
    userId: 1
};
