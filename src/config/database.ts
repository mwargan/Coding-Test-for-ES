// Normally you'd have a .env file with these values and use dotenv to load them into process.env, but for simplicity we'll just hardcode them here
export default {
    database: "postgres",
    user: "postgres",
    password: "postgres",
    host: "localhost",
    port: 5432,
    ensureDatabaseExists: true,
    defaultDatabase: "postgres"
}