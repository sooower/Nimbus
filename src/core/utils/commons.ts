import crypto from "crypto";

export const Commons = {
    getEnvBaseDirAndExt() {
        const env = process.env.NODE_ENV ?? "dev";
        const [baseDir, ext] = env === "prod" ? ["dist", "js"] : ["src", "ts"];
        return { env, baseDir, ext };
    },

    encryptPassword(password: string, salt: string) {
        return crypto.pbkdf2Sync(password, salt, 1000, 16, "sha512").toString("hex");
    },

    comparePassword(password: string, salt: string, encryptedPassword: string) {
        const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 16, "sha512").toString("hex");

        return encryptedPassword === passwordHash;
    },

    generateCacheKey(...args: string[]) {
        return args.join("@").replace(/:/g, "@");
    },

    getParamNamesWithIndex(func: Function): Map<string, number> {
        const funcStr: string = func.toString();
        const argsStr: string = funcStr.substring(funcStr.indexOf("(") + 1, funcStr.indexOf(")"));
        const argNames: string[] = argsStr.split(",").map(arg => arg.trim());
        const paramMap: Map<string, number> = new Map();

        argNames.forEach((arg, index) => {
            paramMap.set(arg, index);
        });

        return paramMap;
    },

    generateRequestId(length: number = 7): string {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    },
};
