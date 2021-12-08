exports.query = `{
  flights_agg (filter: {departure_airport: "TOF", ticket_flights: true}) {
    count
    ticket_flights (filter: {fare_conditions: "Business"})
  }
}
`;

exports.schema = 'public';
exports.user = {
    userId: 2
};
