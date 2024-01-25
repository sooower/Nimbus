import { DataSource, DataSourceOptions } from "typeorm";

import { ObjectsUtil } from "../utils/objectUtil";
import { configService } from "./configService";

export const dataSourceService = new DataSource(
    ObjectsUtil.merge<DataSourceOptions>(configService.dataSource, {
        type: "postgres",
        host: "localhost",
        port: 5432,
        logging: false,
        synchronize: false,
    }),
);
