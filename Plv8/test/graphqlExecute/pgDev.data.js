exports.query = `query {
  flights (take:50, filter: {ticket_flights: true})
  {
    ticket_flights (filter: {fare_conditions: "Business"})
    {
      ticket_no
    }
  }
  flights_agg (filter: {departure_airport: "TOF", ticket_flights: true}) {
    count
    ticket_flights (filter: {fare_conditions: "Business"})
  }
}
`

exports.schema = 'public';
