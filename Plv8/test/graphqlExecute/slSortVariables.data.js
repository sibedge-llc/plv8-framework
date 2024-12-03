exports.query = `query ($sort: any, $sortDesc: any) {
    section (orderBy: $sort, orderByDescending: $sortDesc) {
      id
      name
    }
  }
  `;

exports.variables = { sort: null, sortDesc: "name" };
