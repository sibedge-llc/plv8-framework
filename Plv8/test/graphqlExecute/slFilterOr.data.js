exports.query = `query {
  section (filter: { or: [ { company_id: { equals: 2 }, name: { ends: 1 } }, { name: { equals: "Bananas" } } ] }) {
    id
    name
  }
}
`;
