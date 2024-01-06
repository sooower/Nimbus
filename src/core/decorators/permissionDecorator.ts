import { KEY_PERMISSION } from "../constants";

export function Permis(permis: string[]): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(KEY_PERMISSION, permis, target.constructor, key);
    };
}
