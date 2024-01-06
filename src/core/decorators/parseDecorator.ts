import { KEY_PARSE_ARRAY_TYPE, KEY_PARSE_TYPE } from "../constants";
import { Metadatas } from "../utils/metadatas";

export type PropertyMetadata = {
    name: string;
    clazz: new () => any;
};

export type PropertyArrayMetadata = {
    name: string;
    clazz: new () => any;
};

export function ParseType(clazz?: new () => any): PropertyDecorator {
    return (target: object, key: string | symbol) => {
        const metadata: PropertyMetadata = {
            name: String(key),
            clazz: clazz ?? Reflect.getMetadata("design:type", target, key),
        };
        Metadatas.extendArray(KEY_PARSE_TYPE, metadata, target.constructor);
    };
}

export function ParseArrayType(clazz: new () => any): PropertyDecorator {
    return (target: object, key: string | symbol) => {
        const metadata: PropertyArrayMetadata = {
            name: String(key),
            clazz,
        };
        Metadatas.extendArray(KEY_PARSE_ARRAY_TYPE, metadata, target.constructor);
    };
}
