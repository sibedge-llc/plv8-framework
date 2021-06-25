const connectionString = require('./connection-string').connectionString;

if (connectionString == null || connectionString === '') {
  const username = process.env.PLV8_POSTGRES_USER;
  const password = process.env.PLV8_POSTGRES_PASSWORD;
  const host = process.env.PLV8_POSTGRES_HOST;
  const port = process.env.PLV8_POSTGRES_PORT;
  const dbName = process.env.PLV8_DB_NAME;

  exports.connStr = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
} else {
  exports.connStr = connectionString;
}

