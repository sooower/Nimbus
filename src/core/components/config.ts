import path from "path";
import { Commons } from "@/core/utils/commons";
import { Objects } from "@/core/utils/objects";

function loadConfig(): any {
    const { env, baseDir, ext } = Commons.getEnvBaseDirAndExt();
    const defaultConfig = require(path.resolve(`${baseDir}/config/config.${ext}`)).default;
    const envConfig = require(path.resolve(`${baseDir}/config/config.${env}.${ext}`)).default;

    return Objects.merge(envConfig, defaultConfig);
}

export const globalConfig = loadConfig();
