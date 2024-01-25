import log4js, { Configuration } from "log4js";

import { ObjectsUtil } from "../utils/objectUtil";
import { configService } from "./configService";

export function appLogger(category?: string) {
    log4js.configure(
        ObjectsUtil.merge<Configuration>(configService.log4js, {
            appenders: {
                file: {
                    type: "dateFile",
                    filename: "logs/app.log",
                    encoding: "utf-8",
                    layout: {
                        type: "pattern",
                        pattern: "[%d{ISO8601}] [%p] %m",
                    },
                    pattern: "yyyy-MM-dd",
                    keepFileExt: true,
                    alwaysIncludePattern: true,
                },
                console: { type: "console" },
            },
            categories: {
                default: {
                    appenders: ["file", "console"],
                    level: "info",
                },
            },
        }),
    );
    const log = log4js.getLogger(category ?? "app");
    log.level = configService.logger?.level ?? "info";

    return log;
}

export const loggerService = appLogger();
