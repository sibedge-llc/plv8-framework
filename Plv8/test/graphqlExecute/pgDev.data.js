exports.query = `query ($filter: any) {
  flights (take:50, filter: {ticket_flights: true})
  {
    ticket_flights (filter: $filter)
    {
      ticket_no
    }
  }
  flights_agg (filter: {departure_airport: "TOF", ticket_flights: true}) {
    count
    ticket_flights (filter: $filterLong)
  }
}
`

exports.schema = 'public';
exports.variables = {
  filter: { fare_conditions: "Business" },
  filterLong: { fare_conditions: "Business", amount: { greater: 6500 } }
};
