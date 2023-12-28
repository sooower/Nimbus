import { KEY_INJECTABLE } from "@/core/constants";

export function Service(target: Function) {
    Reflect.defineMetadata(KEY_INJECTABLE, true, target);
}
