import crypto from "crypto";

export const Commons = {
    getEnvBaseDirAndExt() {
        const env = process.env.NODE_ENV ?? "dev";
        return {
            env,
            baseDir: env === "prod" ? "dist" : "src",
            ext: env === "prod" ? "js" : "ts",
        };
    },
    encryptPassword(password: string, salt: string) {
        return crypto
            .pbkdf2Sync(password, salt, 1000, 16, "sha512")
            .toString("hex");
    },

    comparePassword(password: string, salt: string, encryptedPassword: string) {
        const passwordHash = crypto
            .pbkdf2Sync(password, salt, 1000, 16, "sha512")
            .toString("hex");

        return encryptedPassword === passwordHash;
    },

    generateCacheKey(...args: string[]) {
        return args.join("@").replace(/:/g, "@");
    },

    getParamNamesWithIndex(func: Function): Map<string, number> {
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
    },
};

export const Objects = {
    /**
     * Check for value is undefined or null.
     * @param value
     */
    isNil(value: any) {
        return value === undefined || value === null;
    },

    /**
     * Check for value is object.
     * @param value
     */
    isObject(value: any) {
        return typeof value === "object"
            ? value !== null
            : typeof value === "function";
    },

    /**
     * Merge objects, the properties of object `to` will be covered by object `from`.
     * @param from Object used to copy from.
     * @param to Object used to copy to a new object.
     */
    mergeObjects<T>(from: any, to: any): T {
        const merged = { ...to };

        for (const key in from) {
            if (from.hasOwnProperty(key)) {
                if (
                    typeof from[key] === "object" &&
                    to.hasOwnProperty(key) &&
                    typeof to[key] === "object"
                ) {
                    merged[key] = Objects.mergeObjects(from[key], to[key]);
                } else {
                    merged[key] = from[key];
                }
            }
        }

        return merged;
    },
};
