exports.query = ` query {
    Families (take: 10) {
        Id
        Name
      }
  }
`;

exports.schema = 'public';
