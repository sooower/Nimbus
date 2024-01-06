export const Metadatas = {
    extendArray(
        metadataKey: string,
        metadataValue: any,
        target: object,
        methodKey?: string | symbol,
    ) {
        // Constructor metadata
        if (methodKey === undefined) {
            const originMetadata: any[] = Reflect.getMetadata(metadataKey, target) ?? [];
            Reflect.defineMetadata(metadataKey, [...originMetadata, metadataValue], target);

            return;
        }

        // Member method metadata
        const existsValue: any[] = Reflect.getMetadata(metadataKey, target, methodKey) ?? [];
        Reflect.defineMetadata(metadataKey, [...existsValue, metadataValue], target, methodKey);
    },
};
