import { DataSource } from "typeorm";
import { globalConfig } from "./config";

export const ds = new DataSource(
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
