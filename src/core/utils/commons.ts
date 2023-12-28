import crypto from "crypto";

function getEnvBaseDirAndExt() {
    const env = process.env.NODE_ENV ?? "dev";
    return {
        env,
        baseDir: env === "prod" ? "dist" : "src",
        ext: env === "prod" ? "js" : "ts",
    };
}

function encryptPassword(password: string, salt: string) {
    return crypto
        .pbkdf2Sync(password, salt, 1000, 16, "sha512")
        .toString("hex");
}

function comparePassword(
    password: string,
    salt: string,
    encryptedPassword: string,
) {
    const passwordHash = crypto
        .pbkdf2Sync(password, salt, 1000, 16, "sha512")
        .toString("hex");

    return encryptedPassword === passwordHash;
}

function generateCacheKey(...args: string[]) {
    return args.join("@").replace(/:/g, "@");
}

function getParamNamesWithIndex(func: Function): Map<string, number> {
    const funcStr: string = func.toString();
    const argsStr: string = funcStr.substring(
        funcStr.indexOf("(") + 1,
        funcStr.indexOf(")"),
    );
    const argNames: string[] = argsStr.split(",").map(arg => arg.trim());
    const paramMap: Map<string, number> = new Map();

    argNames.forEach((arg, index) => {
        paramMap.set(arg, index);
    });

    return paramMap;
}

export const Commons = {
    getEnvBaseDirAndExt,
    encryptPassword,
    comparePassword,
    generateCacheKey,
    getParamNamesWithIndex,
};
