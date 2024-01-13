import {
    KEY_CTOR_CIRCULAR_INJECT,
    KEY_INJECT,
    KEY_INJECTABLE,
    KEY_PROP_CIRCULAR_INJECT,
} from "../constants";
import { DecoratorError } from "../errors";
import { Metadatas } from "../utils/metadatas";

export type ConstructorMetadata = {
    index: number;
    clazz?: () => any;
};

export type PropertyMetadata = {
    name: string;
    clazz: any | (() => any);
};

export function Injectable(): ClassDecorator {
    return (target: object) => {
        Reflect.defineMetadata(KEY_INJECTABLE, true, target);
    };
}

export function CircularInject(
    clazz: (...args: any[]) => any,
): ParameterDecorator & PropertyDecorator {
    return (target: object, key?: string | symbol | undefined, index?: number) => {
        if (key !== undefined) {
            const metadata: PropertyMetadata = {
                name: String(key),
                clazz,
            };
            Metadatas.extendArray(KEY_PROP_CIRCULAR_INJECT, metadata, target.constructor);

            return;
        }

        if (index === undefined) {
            throw new DecoratorError(`Parameter index must be provided.`);
        }

        const metadata: ConstructorMetadata = {
            index,
            clazz,
        };
        Metadatas.extendArray(KEY_CTOR_CIRCULAR_INJECT, metadata, target);
    };
}

export function Inject(): PropertyDecorator {
    return (target: object, key: string | symbol) => {
        const clazz = Reflect.getMetadata("design:type", target, key);
        const metadata: PropertyMetadata = {
            name: String(key),
            clazz,
        };
        Metadatas.extendArray(KEY_INJECT, metadata, target.constructor);
    };
}
