import { Objects } from "@/core/utils/objects";

function isUndefined(object: any, ...errMsg: any[]) {
    if (!Objects.isUndefined(object)) {
        throw new Error(...errMsg);
    }
}

function isNull(object: any, ...errMsg: any[]) {
    if (!Objects.isNull(object)) {
        throw new Error(...errMsg);
    }
}

function isNil(object: any, ...errMsg: any[]) {
    if (!Objects.isNil(object)) {
        throw new Error(...errMsg);
    }
}

function isObject(object: any, ...errMsg: any[]) {
    if (!Objects.isObject(object)) {
        throw new Error(...errMsg);
    }
}

export const Asserts = {
    isUndefined,
    isNull,
    isNil,
    isObject,
};
