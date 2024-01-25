import path from "node:path";

import { CommonUtil } from "../utils/commonUtil";
import { ObjectsUtil } from "../utils/objectUtil";

function initConfig(): any {
    const { env, baseDir, ext } = CommonUtil.getEnvBaseDirAndExt();
    const sharedConfig = require(path.resolve(`${baseDir}/config/shared.${ext}`)).default;
    const envConfig = require(path.resolve(`${baseDir}/config/${env}.${ext}`)).default;

    return ObjectsUtil.merge(envConfig, sharedConfig);
}

export const configService = initConfig();
