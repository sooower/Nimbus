import { globSync } from "glob";
import path from "node:path";

import { loggerService } from "@/common/services/loggerService";

import {
    KEY_CTOR_CIRCULAR_INJECT,
    KEY_INJECT,
    KEY_INJECTABLE,
    KEY_PROP_CIRCULAR_INJECT,
} from "../common/constants";
import {
    ConstructorParamsClassMetadata,
    PropertyClassMetadata,
} from "../common/decorators/injectionDecorator";
import { ClassMetadata } from "../common/decorators/routeDecorator";
import { ObjectInitializationError } from "../common/errors";
import { CommonUtil } from "../common/utils/commonUtil";
import { ObjectsUtil } from "../common/utils/objectUtil";

export class ObjectsFactory {
    private classesMetadataMap: Map<string, ClassMetadata> = new Map();
    private earlySingletonObjectsMap: Map<string, any> = new Map();
    private singletonObjectsMap: Map<string, any> = new Map();

    constructor() {
        this.initialize();
    }

    destroy() {
        this.classesMetadataMap == undefined;
        this.earlySingletonObjectsMap == undefined;
        this.singletonObjectsMap == undefined;

        loggerService.info("Objects factory destroyed.");
    }

    getClassMetadataContainer() {
        return this.classesMetadataMap;
    }

    getObject<T>(name: string): T {
        return this.singletonObjectsMap.get(name);
    }

    initialize() {
        this.scanInjectableClasses();

        for (const classMetadata of this.classesMetadataMap.values()) {
            this.createObjectInstance(classMetadata);
        }

        loggerService.info(`Objects factory initialized.`);
    }

    private scanInjectableClasses() {
        const { baseDir, ext } = CommonUtil.getEnvBaseDirAndExt();
        const files = globSync(`${baseDir}/**/*.${ext}`);
        const fileObjects = files.map(it => require(path.resolve(it)));

        for (const fileObject of fileObjects) {
            for (const target of Object.values<any>(fileObject)) {
                if (!this.isInjectableClass(target)) {
                    continue;
                }

                const classMetadata: ClassMetadata = {
                    clazz: target,
                    methodsArgsMap: new Map(),
                };

                Object.getOwnPropertyNames(target.prototype)
                    .filter(methodName => methodName !== "constructor")
                    .forEach(methodName => {
                        classMetadata.methodsArgsMap.set(methodName, []);
                    });

                this.classesMetadataMap.set(target.name, classMetadata);
            }
        }
    }

    private createObjectInstance(classMetadata: ClassMetadata) {
        if (!this.isInjectableClass(classMetadata.clazz)) {
            throw new ObjectInitializationError(
                `Class "${classMetadata.clazz.name}" is not injectable.`,
            );
        }

        let instance: any = this.singletonObjectsMap.get(classMetadata.clazz.name);
        if (instance !== undefined) {
            return;
        }

        instance = this.earlySingletonObjectsMap.get(classMetadata.clazz.name);
        if (instance !== undefined) {
            return;
        }

        instance = new classMetadata.clazz();
        this.earlySingletonObjectsMap.set(classMetadata.clazz.name, instance);

        this.populateInstanceProperties(instance, classMetadata);

        this.singletonObjectsMap.set(classMetadata.clazz.name, instance);
        this.earlySingletonObjectsMap.delete(classMetadata.clazz.name);
    }

    private populateInstanceProperties(instance: any, classMetadata: ClassMetadata) {
        // Populate constructor parameter classes
        const instanceParamNames = Reflect.ownKeys(instance);
        const constructorParamClassesMetadata: any[] =
            Reflect.getMetadata("design:paramtypes", classMetadata.clazz) ?? [];

        constructorParamClassesMetadata.forEach((clazz, index) => {
            // Resolve constructor parameter classes circular dependency
            if (clazz === undefined) {
                const constructorCircularInjectClassesMetadata: ConstructorParamsClassMetadata[] =
                    Reflect.getMetadata(KEY_CTOR_CIRCULAR_INJECT, classMetadata.clazz) ?? [];

                if (constructorCircularInjectClassesMetadata[index] === undefined) {
                    throw new ObjectInitializationError(
                        `Constructor parameter index "${index}" of class "${classMetadata.clazz.name}" cannot be injected, is there an unresolved circular dependency?`,
                    );
                }

                clazz = constructorCircularInjectClassesMetadata[index].clazz!();
            }

            const propertyName = String(instanceParamNames[index]);
            this.doPopulateInstanceProperties(instance, propertyName, clazz.name);
        });

        // Populate property classes
        const propertyClassesMetadata: PropertyClassMetadata[] =
            Reflect.getMetadata(KEY_INJECT, classMetadata.clazz) ?? [];

        const propertyCircularInjectClassesMetadata: PropertyClassMetadata[] =
            Reflect.getMetadata(KEY_PROP_CIRCULAR_INJECT, classMetadata.clazz) ?? [];
        const propertyCircularInjectClassesMap = new Map<string, any>();
        propertyCircularInjectClassesMetadata.forEach(it => {
            propertyCircularInjectClassesMap.set(it.name, it.clazz().name);
        });

        for (const propertyClassMetadata of propertyClassesMetadata) {
            const propertyName = propertyClassMetadata.name;
            const propertyClassName: string = propertyClassMetadata.clazz?.name;

            if (propertyClassName !== undefined) {
                this.doPopulateInstanceProperties(instance, propertyName, propertyClassName);

                continue;
            }

            // Check have an other handle of circular dependency
            if (!propertyCircularInjectClassesMap.has(propertyName)) {
                throw new ObjectInitializationError(
                    `Property "${propertyName}" of class "${classMetadata.clazz.name}" cannot be injected, is there an unresolved circular dependency?`,
                );
            }
        }

        // Resolve property classes circular dependency
        for (const classMetadata of propertyCircularInjectClassesMetadata) {
            this.doPopulateInstanceProperties(
                instance,
                classMetadata.name,
                classMetadata.clazz()?.name,
            );
        }
    }

    private doPopulateInstanceProperties(
        instance: any,
        propertyName: string,
        propertyClassName: string,
    ) {
        if (instance[propertyName] === undefined) {
            if (this.getObjectInstance(propertyClassName) === undefined) {
                const propertyClassMetadata = this.classesMetadataMap.get(propertyClassName);

                // Maybe some property classes not need to inject
                if (propertyClassMetadata === undefined) {
                    return;
                }

                this.createObjectInstance(propertyClassMetadata);
            }

            // The instance must be retrieved again
            instance[propertyName] = this.getObjectInstance(propertyClassName);
        }
    }

    private getObjectInstance(className: string) {
        let instance: any;
        instance = this.singletonObjectsMap.get(className);
        if (instance !== undefined) {
            return instance;
        }

        instance = this.earlySingletonObjectsMap.get(className);
        if (instance !== undefined) {
            return instance;
        }

        return undefined;
    }

    private isInjectableClass(target: any) {
        if (!ObjectsUtil.isObject(target)) {
            return false;
        }

        return Reflect.getMetadata(KEY_INJECTABLE, target) !== undefined;
    }
}
