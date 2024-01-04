import { DataSource } from "typeorm";
import { DataSourceOptions } from "typeorm/data-source/DataSourceOptions";
import { globalConfig } from "@/core/components/config";
import { Objects } from "@/core/utils/objects";

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
