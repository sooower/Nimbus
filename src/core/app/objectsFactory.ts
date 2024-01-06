import { globSync } from "glob";
import path from "path";

import { logger } from "../components/logger";
import { KEY_INJECTABLE, KEY_LAZY_INJECT } from "../constants";
import { ConstructorParamMetadata } from "../decorators/injectionDecorator";
import { ClassMetadata } from "../decorators/routeDecorator";
import { ObjectInitializationError } from "../errors";
import { Commons } from "../utils/commons";
import { Objects } from "../utils/objects";

export class ObjectsFactory {
    private classMetadataContainer: Map<string, ClassMetadata> = new Map();
    private earlySingletonObjects: Map<string, any> = new Map();
    private singletonObjects: Map<string, any> = new Map();

    getSingletonObjects() {
        return this.singletonObjects;
    }

    getClassMetadataContainer() {
        return this.classMetadataContainer;
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

                const ctorParamClasses: any[] =
                    Reflect.getMetadata("design:paramtypes", target) ?? [];
                ctorParamClasses.forEach((clazz, index) => {
                    // Resolve circular dependency
                    if (clazz === undefined) {
                        const ctorParamsMetadata: ConstructorParamMetadata[] =
                            Reflect.getMetadata(KEY_LAZY_INJECT, target) ?? [];

                        const fn = ctorParamsMetadata[index].instantiateFn;
                        if (fn === undefined) {
                            throw new ObjectInitializationError(
                                `Instantiate  of class "${clazz}" is not found.`,
                            );
                        }

                        clazz = fn();
                    }
                    classMetadata.ctorParamClassesMetadata.push(clazz);
                });

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

        const instance = new classMetadata.clazz();
        this.earlySingletonObjects.set(classMetadata.clazz.name, instance);

        this.populateProperties(instance, classMetadata);

        this.singletonObjects.set(classMetadata.clazz.name, instance);
        this.earlySingletonObjects.delete(classMetadata.clazz.name);
    }

    private populateProperties(instance: any, classMetadata: ClassMetadata) {
        if (classMetadata.ctorParamClassesMetadata === undefined) {
            return;
        }

        const instanceParamNames = Reflect.ownKeys(instance);
        for (let i = 0; i < classMetadata.ctorParamClassesMetadata.length; i++) {
            const propertyClass = classMetadata.ctorParamClassesMetadata[i];
            const propertyName = instanceParamNames[i];

            if (instance[propertyName] === undefined) {
                if (this.getObjectInstance(propertyClass.name) === undefined) {
                    const propertyClassMetadata = this.classMetadataContainer.get(
                        propertyClass.name,
                    );

                    // Maybe some params not need to inject
                    if (propertyClassMetadata === undefined) {
                        continue;
                    }
                    this.createObjectInstance(propertyClassMetadata);
                }

                instance[propertyName] = this.getObjectInstance(propertyClass.name);
            }
        }
    }

    private getObjectInstance(className: string) {
        let instance: any;
        instance = this.singletonObjects.get(className);
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
