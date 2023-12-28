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
     * Check for value is undefined.
     * @param value
     */
    isUndefined(value: any) {
        return value === undefined;
    },

    /**
     * Check for value is undefined or null.
     * @param value
     */
    isNil(value: any) {
        return Objects.isUndefined(value) || Objects.isNull(value);
    },

    /**
     * Check for value is null.
     * @param value
     */
    isNull(value: any) {
        return value === null;
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

export const Asserts = {
    isUndefined(object: any, ...errMsg: any[]) {
        if (!Objects.isUndefined(object)) {
            throw new Error(...errMsg);
        }
    },

    isNull(object: any, ...errMsg: any[]) {
        if (!Objects.isNull(object)) {
            throw new Error(...errMsg);
        }
    },

    isNil(object: any, ...errMsg: any[]) {
        if (!Objects.isNil(object)) {
            throw new Error(...errMsg);
        }
    },

    isObject(object: any, ...errMsg: any[]) {
        if (!Objects.isObject(object)) {
            throw new Error(...errMsg);
        }
    },
};
