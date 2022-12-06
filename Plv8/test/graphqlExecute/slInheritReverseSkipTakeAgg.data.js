exports.query = `query {
    company (skip: 1, take: 1) {
      id
      name
      section_agg {
        count
      }
    }
  }
`;

exports.user = {
    userId: 1
};
