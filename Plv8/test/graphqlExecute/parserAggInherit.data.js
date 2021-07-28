exports.query = ` query {
  users_agg (filter: { post: true }) {
    count
    post (filter: { active: true })
  }
}
`;

exports.schema = 's1';
