import { migrate } from "postgres-migrations"
import dbConfig from "./src/config/database.js"

const runMigration = async () => {

    console.log("Running migrations...")

    await migrate(dbConfig, "./migrations")

    console.log("Done")
}

runMigration()