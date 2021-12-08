exports.query = `query {
  section (filter: { name: { contains: "-" }, or: [ { name: { ends: "2" }, name: { starts: "A" } }, { name: { ends: "s" } } ] }) {
    id
    name
  }
}
`;
