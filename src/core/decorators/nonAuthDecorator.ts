import { KEY_NONE_AUTH } from "@/core/constants";

export function NonAuth(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    Reflect.defineMetadata(KEY_NONE_AUTH, true, target, propertyKey);
}
