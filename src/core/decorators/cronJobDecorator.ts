import { CronJob as Job } from "cron";
import { globalConfig } from "@/core/components/config";

export function CronJob(cronTime: string, timeZone?: string): MethodDecorator {
    return function (target: object, key: string | symbol, descriptor: PropertyDescriptor) {
        if (globalConfig.cronJob?.start) {
            new Job(cronTime, descriptor.value, null, true, timeZone ?? "Asia/Shanghai").start();
        }
    };
}
