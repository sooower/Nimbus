import path from "path";

import { Commons } from "../utils/commons";
import { Objects } from "../utils/objects";

function loadConfig(): any {
    const { env, baseDir, ext } = Commons.getEnvBaseDirAndExt();
    const sharedConfig = require(path.resolve(`${baseDir}/config/config.shared.${ext}`)).default;
    const envConfig = require(path.resolve(`${baseDir}/config/config.${env}.${ext}`)).default;

    return Objects.merge(envConfig, sharedConfig);
}

export const globalConfig = loadConfig();
