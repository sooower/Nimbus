import { DataSource, DataSourceOptions } from "typeorm";

import { Objects } from "../utils/objects";
import { globalConfig } from "./config";

export const DS = new DataSource(
    Objects.merge<DataSourceOptions>(globalConfig.dataSource, {
        type: "postgres",
        host: "localhost",
        port: 5432,
        entities: ["src/entities/**/*.ts"],
        migrations: ["src/migrations/**/*.ts"],
        subscribers: ["src/subscribers/**/*.ts"],
        logging: false,
        synchronize: true,
    }),
);
