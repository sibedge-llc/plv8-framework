exports.query = `query {
  section_agg (groupBy: company_id) {
    key
    count
  }
}
`;
