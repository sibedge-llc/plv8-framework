exports.query = `query {
    company (filter: { section: true }) {
      id
      name
      section (filter: { name: { equals: "Appliances-2" } }) {
        id
        name
      }
    }
  }
`;

exports.user = {
    userId: 1
};
