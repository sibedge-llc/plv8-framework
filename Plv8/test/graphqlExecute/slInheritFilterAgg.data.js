exports.query = `query {
    section_agg (filter: { company: true }) {
      count
      company (filter: { name: { equalsNoCase: "Appliances" } })
    }
  }
`;

exports.user = {
    userId: 1
};
