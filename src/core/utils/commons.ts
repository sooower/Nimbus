import crypto from "node:crypto";
import stringify from "safe-stable-stringify";

export enum TimeUnit {
    Second,
    Minute,
    Hour,
    Day,
    Week,
    Month,
}

export const Commons = {
    getEnvBaseDirAndExt() {
        const env = process.env.NODE_ENV ?? "dev";
        const [baseDir, ext] = env === "prod" ? ["dist", "js"] : ["src", "ts"];
        return { env, baseDir, ext };
    },

    hashString(str: string): string {
        if (typeof str !== "string") {
            str = stringify(str) ?? "";
        }
        return crypto.createHash("sha256").update(str).digest("hex");
    },

    encryptPassword(password: string, salt: string) {
        return crypto.pbkdf2Sync(password, salt, 1000, 16, "sha512").toString("hex");
    },

    comparePassword(password: string, salt: string, encryptedPassword: string) {
        const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 16, "sha512").toString("hex");

        return encryptedPassword === passwordHash;
    },

    generateCacheKey(scope: string, ...keys: string[]) {
        return `${scope}@${Commons.hashString(keys.join("|"))}`;
    },

    getParamNamesWithIndex(func: (...args: any[]) => Promise<any>): Map<string, number> {
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

    cutRoutePath(str: string): string {
        if (!str.startsWith("/")) {
            str = "/" + str;
        }
        if (str.endsWith("/")) {
            str = str.slice(0, str.length - 1);
        }
        return str;
    },

    parseSeconds(time: number, timeUnit: TimeUnit) {
        switch (timeUnit) {
            case TimeUnit.Second:
                return time;
            case TimeUnit.Minute:
                return time * 60;
            case TimeUnit.Hour:
                return time * 60 * 60;
            case TimeUnit.Day:
                return time * 60 * 60 * 24;
            case TimeUnit.Week:
                return time * 60 * 60 * 24 * 7;
            case TimeUnit.Month:
                return time * 60 * 60 * 24 * 30;
        }
    },
};
