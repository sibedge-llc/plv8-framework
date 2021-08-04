exports.query = ` query {
    users (filter: {name: {contains: "lex"}}) {
        id
      }
  }
`;

exports.schema = 's1';
