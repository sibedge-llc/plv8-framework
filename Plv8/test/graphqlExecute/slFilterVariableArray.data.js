exports.query = `query {
    section (filter: $filter) {
      id
      name
    }
    section_agg (filter: $filter) {
      count
    }
  }
  `;

exports.variables = { filter: { company_id: { in: [1, 3] } } };
