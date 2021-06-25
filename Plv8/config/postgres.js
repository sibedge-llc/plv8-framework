const username = process.env.POSTGRES_USER;
const password = process.env.POSTGRES_PASSWORD;
const host = process.env.POSTGRES_HOST;
const port = process.env.POSTGRES_PORT;
const dbName = process.env.DB_NAME
exports.connStr = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
