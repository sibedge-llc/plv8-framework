exports.query = `query {
    section (filter: $filter) {
      id
      name
    }
    section_agg (filter: $filterLong) {
      count
    }
  }
  `; 

exports.variables = {
    filter: { company_id: { equals: 2 }, name: { ends: 1 } },
    filterLong: { company_id: { equals: 2 } }
};
