import { KEY_NONE_AUTH } from "../constants";

export function NonAuth(): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(KEY_NONE_AUTH, true, target.constructor, key);
    };
}
