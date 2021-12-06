exports.query = `query {
    section (filter: { company: true }) {
      id
      name
      company (filter: { name: { ends: "uits" } }) {
        id
        name
      }
    }
  }
`;

exports.user = {
  isAnonymous: true
};
