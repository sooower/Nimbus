import log4js from "log4js";
import { globalConfig } from "./config";

export function appLogger(category?: string) {
    log4js.configure({
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
    });
    const log = log4js.getLogger(category ?? "app");
    log.level = globalConfig.logger.level ?? "info";

    return log;
}

export const logger = appLogger();
