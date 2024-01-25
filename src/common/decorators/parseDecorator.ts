import { KEY_PARSE_ARRAY_TYPE, KEY_PARSE_TYPE } from "../constants";
import { MetadataUtil } from "../utils/metadataUtil";

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
        MetadataUtil.extendArray(KEY_PARSE_TYPE, metadata, target.constructor);
    };
}

export function ParseArrayType(clazz: new () => any): PropertyDecorator {
    return (target: object, key: string | symbol) => {
        const metadata: PropertyArrayMetadata = {
            name: String(key),
            clazz,
        };
        MetadataUtil.extendArray(KEY_PARSE_ARRAY_TYPE, metadata, target.constructor);
    };
}
