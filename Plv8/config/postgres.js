const generateConnString = () => {
  const username = process.env.PLV8_POSTGRES_USER;
  const password = process.env.PLV8_POSTGRES_PASSWORD;
  const host = process.env.PLV8_POSTGRES_HOST;
  const port = process.env.PLV8_POSTGRES_PORT;
  const dbName = process.env.PLV8_DB_NAME;

  return `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
};

try {
  const connectionString = require('./connection-string').connectionString;

  if (connectionString == null || connectionString === '') {
    exports.connStr = generateConnString();
  }
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }
  exports.connStr = generateConnString();
}

