import crypto from "crypto";

export function getEnvBaseDirAndExt(): {
    env: string;
    baseDir: string;
    ext: string;
} {
    const env = process.env.NODE_ENV ?? "dev";
    return {
        env,
        baseDir: env === "prod" ? "dist" : "src",
        ext: env === "prod" ? "js" : "ts",
    };
}

export function mergeObjects(from: any, to: any): any {
    const merged = { ...to };

    for (const key in from) {
        if (from.hasOwnProperty(key)) {
            if (
                typeof from[key] === "object" &&
                to.hasOwnProperty(key) &&
                typeof to[key] === "object"
            ) {
                merged[key] = mergeObjects(from[key], to[key]);
            } else {
                merged[key] = from[key];
            }
        }
    }

    return merged;
}

export function getParamNamesWithIndex(func: Function): Map<string, number> {
    const funcString: string = func.toString();
    const argsStartIndex: number = funcString.indexOf("(") + 1;
    const argsEndIndex: number = funcString.indexOf(")");
    const argsString: string = funcString.substring(
        argsStartIndex,
        argsEndIndex,
    );
    const argNames: string[] = argsString.split(",").map(arg => arg.trim());
    const paramMap: Map<string, number> = new Map();

    argNames.forEach((arg, index) => {
        paramMap.set(arg, index);
    });

    return paramMap;
}

export function encryptPassword(password: string, salt: string) {
    return crypto
        .pbkdf2Sync(password, salt, 1000, 64, "sha512")
        .toString("hex");
}

export function comparePassword(
    password: string,
    salt: string,
    encryptedPassword: string,
) {
    const passwordHash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, "sha512")
        .toString("hex");

    return encryptedPassword === passwordHash;
}

export function generateCacheKey(...args: string[]) {
    return args.join("@").replace(/:/g, "@");
}
