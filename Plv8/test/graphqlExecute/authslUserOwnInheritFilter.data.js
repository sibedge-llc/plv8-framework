exports.query = `query {
    section (filter: { company: true }) {
      id
      name
      company (filter: { company_type_id: 2 }) {
        id
        name
      }
    }
  }
`;

exports.user = {
  userId: 1
};
