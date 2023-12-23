import path from "path";

import { getEnvBaseDirAndExt, mergeObjects } from "../utils";

function loadConfig(): any {
    const { env, baseDir, ext } = getEnvBaseDirAndExt();
    const defaultConfig = require(
        path.resolve(`${baseDir}/config/config.${ext}`),
    ).default;
    const envConfig = require(
        path.resolve(`${baseDir}/config/config.${env}.${ext}`),
    ).default;

    return mergeObjects(envConfig, defaultConfig);
}

export const globalConfig = loadConfig();
