import path from "path";
import { Commons, Objects } from "@/core/utils";

function loadConfig(): any {
    const { env, baseDir, ext } = Commons.getEnvBaseDirAndExt();
    const defaultConfig = require(path.resolve(`${baseDir}/config/config.${ext}`)).default;
    const envConfig = require(path.resolve(`${baseDir}/config/config.${env}.${ext}`)).default;

    return Objects.mergeObjects(envConfig, defaultConfig);
}

export const globalConfig = loadConfig();
