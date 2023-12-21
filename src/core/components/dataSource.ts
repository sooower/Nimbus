import { DataSource } from "typeorm";
import { logger } from "./logger";
import { globalConfig } from "./config";

function getDataSource() {
    const ds = new DataSource(
        globalConfig.dataSource ?? {
            type: "postgres",
            host: "localhost",
            port: 5432,
            username: "fomopay",
            password: "password",
            database: "pg.test",
            entities: ["src/entities/**/*.ts"],
            migrations: ["src/migrations/**/*.ts"],
            subscribers: ["src/subscribers/**/*.ts"],
            logging: false,
            synchronize: true,
        },
    );

    // to initialize the initial connection with the database, register all entities
    // and "synchronize" database schema, call "initialize()" method of a newly created database
    // once in your application bootstrap
    ds.initialize()
        .then(() => {
            // here you can start to work with your database
            logger.info("Data Source initialized");
        })
        .catch(err =>
            logger.error("Error when data Source initializing.", err),
        );

    return ds;
}

export const ds = getDataSource();
