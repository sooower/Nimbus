import { globSync } from "glob";
import path from "path";

import { logger } from "../components/logger";
import {
    KEY_CTOR_CIRCULAR_INJECT,
    KEY_INJECT,
    KEY_INJECTABLE,
    KEY_PROP_CIRCULAR_INJECT,
} from "../constants";
import { ConstructorMetadata, PropertyMetadata } from "../decorators/injectionDecorator";
import { ClassMetadata } from "../decorators/routeDecorator";
import { ObjectInitializationError } from "../errors";
import { Commons } from "../utils/commons";
import { Objects } from "../utils/objects";

export class ObjectsFactory {
    private classMetadataContainer: Map<string, ClassMetadata> = new Map();
    private earlySingletonObjects: Map<string, any> = new Map();
    private singletonObjectsFactory: Map<string, any> = new Map();

    constructor() {
        this.initialize();
    }

    destroy() {
        this.classMetadataContainer == undefined;
        this.earlySingletonObjects == undefined;
        this.singletonObjectsFactory == undefined;

        logger.info("Objects factory destroyed.");
    }

    getClassMetadataContainer() {
        return this.classMetadataContainer;
    }

    getObject<T>(name: string): T {
        return this.singletonObjectsFactory.get(name);
    }

    initialize() {
        this.scanInjectableClassesMetadata();

        Array.from(this.classMetadataContainer.values()).forEach(classMetadata => {
            this.createObjectInstance(classMetadata);
        });

        logger.info(`Objects factory initialized.`);
    }

    private scanInjectableClassesMetadata() {
        const { baseDir, ext } = Commons.getEnvBaseDirAndExt();
        const files = globSync(`${baseDir}/**/*.${ext}`);
        const fileObjects = files.map(it => require(path.resolve(it)));

        fileObjects.forEach(fileObject => {
            Object.values(fileObject).forEach((target: any) => {
                if (!this.isInjectableClass(target)) {
                    return;
                }

                const classMetadata: ClassMetadata = {
                    clazz: target,
                    ctorParamClassesMetadata: [],
                    methodArgsMetadata: new Map(),
                };

                Object.getOwnPropertyNames(target.prototype)
                    .filter(it => it !== "constructor")
                    .forEach(methodName => {
                        classMetadata.methodArgsMetadata.set(methodName, []);
                    });

                this.classMetadataContainer.set(target.name, classMetadata);
            });
        });
    }

    private createObjectInstance(classMetadata: ClassMetadata) {
        if (!this.isInjectableClass(classMetadata.clazz)) {
            throw new ObjectInitializationError(
                `Class "${classMetadata.clazz.name}" is not injectable.`,
            );
        }

        let instance: any = this.singletonObjectsFactory.get(classMetadata.clazz.name);
        if (instance !== undefined) {
            return;
        }

        instance = this.earlySingletonObjects.get(classMetadata.clazz.name);
        if (instance !== undefined) {
            return;
        }

        instance = new classMetadata.clazz();
        this.earlySingletonObjects.set(classMetadata.clazz.name, instance);

        this.populateInstanceProperties(instance, classMetadata);

        this.singletonObjectsFactory.set(classMetadata.clazz.name, instance);
        this.earlySingletonObjects.delete(classMetadata.clazz.name);
    }

    private populateInstanceProperties(instance: any, classMetadata: ClassMetadata) {
        if (classMetadata.ctorParamClassesMetadata === undefined) {
            return;
        }

        // Populate constructor classes
        const instanceParamNames = Reflect.ownKeys(instance);
        const ctorParamClasses: any[] =
            Reflect.getMetadata("design:paramtypes", classMetadata.clazz) ?? [];

        ctorParamClasses.forEach((clazz, index) => {
            // Resolve circular dependency
            if (clazz === undefined) {
                const ctorMetadata: ConstructorMetadata[] =
                    Reflect.getMetadata(KEY_CTOR_CIRCULAR_INJECT, classMetadata.clazz) ?? [];

                if (ctorMetadata[index] === undefined) {
                    throw new ObjectInitializationError(
                        `Constructor parameter index "${index}" of class "${classMetadata.clazz.name}" cannot be injected, is there an unresolved circular dependency?`,
                    );
                }

                clazz = ctorMetadata[index].clazz!();
            }
            const propertyName = String(instanceParamNames[index]);
            this.doPopulateInstanceProperties(instance, propertyName, clazz.name);
        });

        // Populate property classes

        const propertiesMetadata: PropertyMetadata[] =
            Reflect.getMetadata(KEY_INJECT, classMetadata.clazz) ?? [];
        for (const propertyMetadata of propertiesMetadata) {
            const propertyName = propertyMetadata.name;
            let propertyClassName: string = propertyMetadata.clazz?.name;

            // Resolve circular dependency
            if (propertyClassName === undefined) {
                const propertiesMetadata: PropertyMetadata[] =
                    Reflect.getMetadata(KEY_PROP_CIRCULAR_INJECT, classMetadata.clazz) ?? [];

                const propertyMap = new Map<string, any>();
                propertiesMetadata.forEach(it => {
                    propertyMap.set(it.name, it.clazz().name);
                });

                if (!propertyMap.has(propertyName)) {
                    throw new ObjectInitializationError(
                        `Property "${propertyName}" of class "${classMetadata.clazz.name}" cannot be injected, is there an unresolved circular dependency?`,
                    );
                }

                propertyClassName = propertyMap.get(propertyName);
            }

            this.doPopulateInstanceProperties(instance, propertyName, propertyClassName);
        }

        const lazyPropertiesMetadata: PropertyMetadata[] =
            Reflect.getMetadata(KEY_PROP_CIRCULAR_INJECT, classMetadata.clazz) ?? [];
        for (const propertyMetadata of lazyPropertiesMetadata) {
            const propertyName = propertyMetadata.name;

            if (!propertyMetadata.clazz) {
                throw new ObjectInitializationError(
                    `Property "${propertyName}" of class "${classMetadata.clazz.name}" cannot be injected, is there an unresolved circular dependency?`,
                );
            }
            this.doPopulateInstanceProperties(
                instance,
                propertyName,
                propertyMetadata.clazz()?.name,
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
                const propertyClassMetadata = this.classMetadataContainer.get(propertyClassName);

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
        instance = this.singletonObjectsFactory.get(className);
        if (instance !== undefined) {
            return instance;
        }

        instance = this.earlySingletonObjects.get(className);
        if (instance !== undefined) {
            return instance;
        }

        return undefined;
    }

    private isInjectableClass(target: any) {
        if (!Objects.isObject(target)) {
            return false;
        }

        return Reflect.getMetadata(KEY_INJECTABLE, target) !== undefined;
    }
}
