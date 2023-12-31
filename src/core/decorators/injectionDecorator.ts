import { KEY_LAZY_INJECT, KEY_INJECTABLE } from "@/core/constants";

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
    return (
        target: object,
        key: string | symbol | undefined,
        index: number,
    ) => {
        const originMetadata: ConstructorParamMetadata[] =
            Reflect.getMetadata(KEY_LAZY_INJECT, target) ?? [];
        const metadata: ConstructorParamMetadata = {
            index,
            instantiateFn,
        };
        Reflect.defineMetadata(
            KEY_LAZY_INJECT,
            [...originMetadata, metadata],
            target,
        );
    };
}
