exports.query = ` query {
    users (filter: {name: {in: ["Alex", "Tom"]}}) {
        id
      }
  }
`;

exports.schema = 's1';
