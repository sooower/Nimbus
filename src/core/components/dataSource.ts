import { DataSource, DataSourceOptions } from "typeorm";

import { Objects } from "../utils/objects";
import { globalConfig } from "./config";

export const dataSource = new DataSource(
    Objects.merge<DataSourceOptions>(globalConfig.dataSource, {
        type: "postgres",
        host: "localhost",
        port: 5432,
        logging: false,
        synchronize: false,
    }),
);
