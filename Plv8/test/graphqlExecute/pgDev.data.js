exports.query = `query  {
  base_order(filter: {cancelled: null,completed: null,id: {less: 100},account: true}, orderBy: order_type, skip: 3, take: 2) {
    id
    order_type
    order_name
    step
    created
    status
    account(filter: {email: {contains: "a"}}) {
      id
      email
    }
  }
  base_order_agg(filter: {cancelled: null,completed: null,id: {less: 100},account: true}) {
    count
    account(filter: {email: {contains: "a"}})
  }
}
`;

exports.schema = 'public';
