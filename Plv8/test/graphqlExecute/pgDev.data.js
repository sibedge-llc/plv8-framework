exports.query = `query  {
  base_order(filter: {cancelled: null,completed: null,status: {contains: "submit"},id: {equals: 34069}}, orderBy: order_type) {
    id
    order_type
    order_name
    step
    created
    status
    account(filter: {email: {contains: "info"}}) {
      id
      email
    }
  }
}
`;

exports.schema = 'public';
