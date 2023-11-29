exports.query = `{
    section (filter: $filter) {
      id
      name
    }
    section_agg (filter: $filter) {
      count
    }
  }
  `;

exports.variables = { filter: { company_id: { equals: 2 }, name: { ends: 1 } } };
