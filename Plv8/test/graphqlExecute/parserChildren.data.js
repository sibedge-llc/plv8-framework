exports.query = ` query {
    users (filter: {data: {children: {id: {equals: 10}}}}) {
        id
      }
  }
`;

exports.schema = 's1';
