/**
 * Check for value is undefined.
 * @param value
 */
function isUndefined(value: any) {
    return value === undefined;
}

/**
 * Check for value is undefined or null.
 * @param value
 */
function isNil(value: any) {
    return Objects.isUndefined(value) || Objects.isNull(value);
}

/**
 * Check for value is null.
 * @param value
 */
function isNull(value: any) {
    return value === null;
}

/**
 * Check for value is object.
 * @param value
 */
function isObject(value: any) {
    return typeof value === "object"
        ? value !== null
        : typeof value === "function";
}

/**
 * Merge objects, the properties of object `to` will be covered by object `from`.
 * @param from Object used to copy from.
 * @param to Object used to copy to a new object.
 */
function mergeObjects<T>(from: any, to: any): T {
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
}

export const Objects = {
    isUndefined,
    isNil,
    isNull,
    isObject,
    mergeObjects,
};
