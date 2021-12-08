exports.query = `query {
  section (filter: { company_id: { equals: 2 }, name: { ends: 1 } }) {
    id
    name
  }
}
`;
