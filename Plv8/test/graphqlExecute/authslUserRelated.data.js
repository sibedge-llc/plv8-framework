exports.query = `query {
    company {
      id
      name
      section {
        id
        name
      }
      section_agg {
        count
      }
    }
  }
`;

exports.user = {
    userId: 1
};
