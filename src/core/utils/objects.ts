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
        return typeof value === "object" ? value !== null : typeof value === "function";
    },

    /**
     * Merge objects, the properties of object `to` will be covered by object `from`.
     * @param from Object used to copy from.
     * @param to Object used to copy to a new object.
     */
    merge<T>(from: any, to: any): T {
        const merged = { ...to };

        for (const key in from) {
            if (from.hasOwnProperty(key)) {
                if (
                    typeof from[key] === "object" &&
                    to.hasOwnProperty(key) &&
                    typeof to[key] === "object"
                ) {
                    merged[key] = Objects.merge(from[key], to[key]);
                } else {
                    merged[key] = from[key];
                }
            }
        }

        return merged;
    },
};
