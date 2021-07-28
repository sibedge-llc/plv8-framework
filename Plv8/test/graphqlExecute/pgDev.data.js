exports.query = `{
  invoice_order(filter: {order_type: {equals: "bn"}, payment: true}) {
    id
    order_type
    created
    order_name
    account {
      id
      email
    }
    payment {
      id
    }
  }
}
`;

exports.schema = 'public';
exports.user = {
    userId: 2
};
