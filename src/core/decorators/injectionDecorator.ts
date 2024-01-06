import { KEY_INJECTABLE, KEY_LAZY_INJECT } from "../constants";
import { Metadatas } from "../utils/metadatas";

export type ConstructorParamMetadata = {
    index: number;
    instantiateFn?: () => any;
};

export function Injectable(): ClassDecorator {
    return (target: object) => {
        Reflect.defineMetadata(KEY_INJECTABLE, true, target);
    };
}

export function LazyInject(instantiateFn?: () => any): ParameterDecorator {
    return (target: object, key: string | symbol | undefined, index: number) => {
        const metadata: ConstructorParamMetadata = {
            index,
            instantiateFn,
        };
        Metadatas.extendArray(KEY_LAZY_INJECT, metadata, target);
    };
}
